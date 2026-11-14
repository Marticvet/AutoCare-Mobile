export type FuelEntryField = "litres" | "amount" | "pricePerLitre";

export type FuelEntryValues = Record<FuelEntryField, string>;

export type FuelEntryUpdate = {
    values: FuelEntryValues;
    explicitOrder: FuelEntryField[];
};

/**
 * Parses a single localized decimal separator without guessing at thousands
 * separators. Invalid, incomplete, and non-finite values remain invalid.
 */
export function parseLocalizedDecimal(value: string | number | null | undefined): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const normalized = String(value ?? "").trim().replace(/\s/g, "");
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(normalized)) return null;
    const parsed = Number(normalized.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
}

const formatDerivedValue = (value: number, precision: number) => {
    if (!Number.isFinite(value) || value <= 0) return "";
    return value.toFixed(precision).replace(/\.?0+$/, "");
};

/**
 * Keeps the two most recently edited fuel values as the source of truth and
 * derives the remaining value. This avoids silently replacing the field the
 * user is actively editing while still supporting any two-of-three workflow.
 */
export function updateFuelEntry(
    current: FuelEntryValues,
    explicitOrder: FuelEntryField[],
    field: FuelEntryField,
    rawValue: string
): FuelEntryUpdate {
    const values = { ...current, [field]: rawValue };
    const orderWithoutField = explicitOrder.filter((entry) => entry !== field);
    const nextOrder = rawValue.trim()
        ? [...orderWithoutField, field]
        : orderWithoutField;

    if (nextOrder.length < 2) return { values, explicitOrder: nextOrder };

    const sourceFields = nextOrder.slice(-2);
    const target = (["litres", "amount", "pricePerLitre"] as FuelEntryField[])
        .find((entry) => !sourceFields.includes(entry));
    if (!target) return { values, explicitOrder: nextOrder };

    const litres = parseLocalizedDecimal(values.litres);
    const amount = parseLocalizedDecimal(values.amount);
    const pricePerLitre = parseLocalizedDecimal(values.pricePerLitre);
    if (sourceFields.some((entry) => {
        const parsed = { litres, amount, pricePerLitre }[entry];
        return parsed === null || parsed <= 0;
    })) {
        return { values, explicitOrder: nextOrder };
    }

    if (target === "amount" && litres && pricePerLitre) {
        values.amount = formatDerivedValue(litres * pricePerLitre, 2);
    } else if (target === "litres" && amount && pricePerLitre) {
        values.litres = formatDerivedValue(amount / pricePerLitre, 3);
    } else if (target === "pricePerLitre" && amount && litres) {
        values.pricePerLitre = formatDerivedValue(amount / litres, 3);
    }

    return { values, explicitOrder: nextOrder };
}

export type FuelLogInput = {
    id?: string | null;
    selected_vehicle_id?: string | null;
    odometer?: number | null;
    total_litres?: number | null;
    full_tank?: string | number | boolean | null;
    date?: string | null;
    time?: string | null;
    created_at?: string | null;
};

export type FuelConsumptionInterval = {
    startOdometer: number;
    endOdometer: number;
    distance: number;
    litres: number;
    litresPer100Km: number;
};

export type FuelConsumptionResult = {
    litresPer100Km: number | null;
    totalDistance: number;
    totalLitres: number;
    intervals: FuelConsumptionInterval[];
    reason: "ok" | "insufficient-full-tanks" | "mixed-vehicles";
};

const isFullTank = (value: FuelLogInput["full_tank"]) =>
    value === true || value === 1 || value === "1" || value === "true";

const chronology = (row: FuelLogInput) => {
    if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        return `${row.date}T${row.time && /^\d{2}:\d{2}/.test(row.time) ? row.time : "00:00"}`;
    }
    return row.created_at ?? "";
};

/**
 * Calculates consumption between full-tank anchors. Litres from partial fills
 * after the baseline are accumulated into the next completed interval; the
 * baseline fill and an unfinished trailing interval are deliberately excluded.
 */
export function calculateFuelConsumption(rows: FuelLogInput[]): FuelConsumptionResult {
    const vehicleIds = new Set(rows.map((row) => row.selected_vehicle_id).filter(Boolean));
    if (vehicleIds.size > 1) {
        return { litresPer100Km: null, totalDistance: 0, totalLitres: 0, intervals: [], reason: "mixed-vehicles" };
    }

    const logs = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => {
            const odometer = Number(row.odometer);
            const litres = Number(row.total_litres);
            return Number.isFinite(odometer) && odometer > 0 && Number.isFinite(litres) && litres > 0;
        })
        .sort((a, b) => {
            const left = chronology(a.row);
            const right = chronology(b.row);
            if (left && right && left !== right) return left.localeCompare(right);
            const odometerDifference = Number(a.row.odometer) - Number(b.row.odometer);
            return odometerDifference || a.index - b.index;
        })
        .map(({ row }) => row);

    let baselineOdometer: number | null = null;
    let pendingLitres = 0;
    const intervals: FuelConsumptionInterval[] = [];

    for (const log of logs) {
        const odometer = Number(log.odometer);
        const litres = Number(log.total_litres);
        if (baselineOdometer === null) {
            if (isFullTank(log.full_tank)) baselineOdometer = odometer;
            continue;
        }

        // Duplicate and decreasing odometers cannot form a reliable interval.
        if (odometer <= baselineOdometer) continue;
        pendingLitres += litres;
        if (!isFullTank(log.full_tank)) continue;

        const distance = odometer - baselineOdometer;
        intervals.push({
            startOdometer: baselineOdometer,
            endOdometer: odometer,
            distance,
            litres: pendingLitres,
            litresPer100Km: (pendingLitres / distance) * 100,
        });
        baselineOdometer = odometer;
        pendingLitres = 0;
    }

    const totalDistance = intervals.reduce((sum, interval) => sum + interval.distance, 0);
    const totalLitres = intervals.reduce((sum, interval) => sum + interval.litres, 0);
    return {
        litresPer100Km: totalDistance > 0 ? (totalLitres / totalDistance) * 100 : null,
        totalDistance,
        totalLitres,
        intervals,
        reason: intervals.length ? "ok" : "insufficient-full-tanks",
    };
}
