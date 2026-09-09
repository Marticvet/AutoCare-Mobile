import { ExpenseCategory, ExpenseDraft } from "../data/models";
import { isoDate } from "../utils/tracking";

export type CsvImportSource = "fuelio" | "drivvo" | "generic";

export type ParsedCsv = {
    delimiter: string;
    headers: string[];
    rows: string[][];
};

export type ImportedExpense = {
    draft: ExpenseDraft;
    rowNumber: number;
    fingerprint: string;
    warning?: string;
};

const normalizeHeader = (value: string) => value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function detectDelimiter(input: string) {
    const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
    const candidates = [",", ";", "\t"];
    return candidates
        .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
        .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

export function parseCsv(input: string): ParsedCsv {
    const text = input.replace(/^\uFEFF/, "");
    const delimiter = detectDelimiter(text);
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        const next = text[index + 1];
        if (character === '"') {
            if (quoted && next === '"') {
                cell += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === delimiter && !quoted) {
            row.push(cell.trim());
            cell = "";
        } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && next === "\n") index += 1;
            row.push(cell.trim());
            cell = "";
            if (row.some(Boolean)) rows.push(row);
            row = [];
        } else {
            cell += character;
        }
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    const [headerRow = [], ...dataRows] = rows;
    return { delimiter, headers: headerRow.map(normalizeHeader), rows: dataRows };
}

const aliases: Record<string, string[]> = {
    date: ["date", "datum", "data", "fecha", "record_date", "expense_date"],
    time: ["time", "hora", "uhrzeit"],
    category: ["category", "type", "expense_type", "transaction_type", "service_type"],
    title: ["title", "description", "name", "service", "expense"],
    amount: ["amount", "total", "total_cost", "cost", "price", "value", "sum"],
    odometer: ["odometer", "mileage", "kilometers", "kilometres", "km"],
    litres: ["litres", "liters", "volume", "quantity", "fuel_volume"],
    pricePerLitre: ["price_per_litre", "price_per_liter", "unit_price", "price_unit", "fuel_price"],
    fuelType: ["fuel_type", "fuel", "type_of_fuel"],
    fullTank: ["full_tank", "full", "tank_full"],
    place: ["place", "vendor", "station", "gas_station", "location", "workshop"],
    paymentMethod: ["payment_method", "payment", "paid_by"],
    notes: ["notes", "note", "comment", "comments"],
    energyKwh: ["energy_kwh", "kwh", "energy", "electricity"],
    pricePerKwh: ["price_per_kwh", "cost_per_kwh"],
    batteryStartPercent: ["battery_start", "start_soc", "starting_battery_percent"],
    batteryEndPercent: ["battery_end", "end_soc", "ending_battery_percent"],
    chargerType: ["charger_type", "connector", "charging_type"],
    chargingSpeedKw: ["charging_speed_kw", "charging_speed", "charger_power_kw"],
    efficiencyKwhPer100Km: ["efficiency_kwh_per_100km", "kwh_per_100km", "efficiency"],
};

function valueFor(headers: string[], row: string[], key: keyof typeof aliases) {
    const index = headers.findIndex((header) => aliases[key].includes(header));
    return index >= 0 ? row[index]?.trim() ?? "" : "";
}

export function parseLocalizedNumber(input: string) {
    let value = input.trim().replace(/[^0-9,.-]/g, "");
    if (!value) return 0;
    const comma = value.lastIndexOf(",");
    const dot = value.lastIndexOf(".");
    if (comma > dot) value = value.replace(/\./g, "").replace(",", ".");
    else if (dot > comma) value = value.replace(/,/g, "");
    else value = value.replace(",", ".");
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function parseImportDate(value: string, source: CsvImportSource) {
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (match) {
        const [, first, second, yearValue] = match;
        const year = yearValue.length === 2 ? Number(yearValue) + 2000 : Number(yearValue);
        // Default to day-first for European exports. A second component above
        // 12 can only be a day, so that row is interpreted as month-first.
        const dayFirst = Number(second) <= 12;
        const month = dayFirst ? Number(second) : Number(first);
        const day = dayFirst ? Number(first) : Number(second);
        const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const parsed = new Date(`${candidate}T12:00:00`);
        if (!Number.isNaN(parsed.getTime()) && parsed.getMonth() + 1 === month && parsed.getDate() === day) return candidate;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : isoDate(parsed);
}

function resolveCategory(raw: string, hasFuel: boolean, hasEnergy: boolean): ExpenseCategory {
    const value = raw.toLowerCase();
    if (hasEnergy || /charg|electric|kwh/.test(value)) return "charging";
    if (hasFuel || /fuel|petrol|gasoline|diesel|refuel/.test(value)) return "fuel";
    if (/insur/.test(value)) return "insurance";
    if (/service|maintenance|oil|tyre|tire/.test(value)) return "service";
    if (/park/.test(value)) return "parking";
    if (/toll/.test(value)) return "toll";
    if (/tax/.test(value)) return "tax";
    if (/wash/.test(value)) return "wash";
    if (/repair/.test(value)) return "repair";
    return "other";
}

function fingerprint(value: string) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

export function mapCsvExpenses({
    csv,
    source,
    userId,
    vehicleId,
    batchId,
    defaultTitles,
}: {
    csv: ParsedCsv;
    source: CsvImportSource;
    userId: string;
    vehicleId: string;
    batchId: string;
    defaultTitles?: Partial<Record<ExpenseCategory, string>>;
}): { expenses: ImportedExpense[]; rejected: { rowNumber: number; reason: string }[] } {
    const expenses: ImportedExpense[] = [];
    const rejected: { rowNumber: number; reason: string }[] = [];
    csv.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const date = parseImportDate(valueFor(csv.headers, row, "date"), source);
        const litres = parseLocalizedNumber(valueFor(csv.headers, row, "litres"));
        const energy = parseLocalizedNumber(valueFor(csv.headers, row, "energyKwh"));
        const unitPrice = parseLocalizedNumber(valueFor(csv.headers, row, "pricePerLitre"));
        const pricePerKwh = parseLocalizedNumber(valueFor(csv.headers, row, "pricePerKwh"));
        const suppliedAmount = parseLocalizedNumber(valueFor(csv.headers, row, "amount"));
        const category = resolveCategory(valueFor(csv.headers, row, "category"), litres > 0, energy > 0);
        const amount = suppliedAmount || (category === "fuel" ? litres * unitPrice : category === "charging" ? energy * pricePerKwh : 0);
        if (!date) {
            rejected.push({ rowNumber, reason: "Date could not be recognized" });
            return;
        }
        if (amount <= 0) {
            rejected.push({ rowNumber, reason: "Amount is missing or zero" });
            return;
        }
        if (category === "fuel" && litres <= 0) {
            rejected.push({ rowNumber, reason: "Fuel volume is missing" });
            return;
        }
        if (category === "charging" && energy <= 0) {
            rejected.push({ rowNumber, reason: "Charging energy is missing" });
            return;
        }
        const rawFingerprint = [source, ...row].join("|");
        const externalId = `${source}:${fingerprint(rawFingerprint)}`;
        const title = valueFor(csv.headers, row, "title")
            || defaultTitles?.[category]
            || (category === "service" ? "Imported service" : category === "other" ? "Imported expense" : category);
        expenses.push({
            rowNumber,
            fingerprint: externalId,
            draft: {
                category,
                userId,
                vehicleId,
                title,
                amount: String(amount),
                date,
                time: valueFor(csv.headers, row, "time") || "12:00",
                odometer: String(parseLocalizedNumber(valueFor(csv.headers, row, "odometer")) || ""),
                place: valueFor(csv.headers, row, "place"),
                paymentMethod: valueFor(csv.headers, row, "paymentMethod"),
                notes: valueFor(csv.headers, row, "notes"),
                litres: String(litres || ""),
                pricePerLitre: String(unitPrice || ""),
                fuelType: valueFor(csv.headers, row, "fuelType") || (category === "fuel" ? "gasoline" : ""),
                fullTank: /^(1|true|yes|y|full)$/i.test(valueFor(csv.headers, row, "fullTank")),
                validFrom: date,
                validTo: "",
                provider: valueFor(csv.headers, row, "place"),
                latitude: "",
                longitude: "",
                energyKwh: String(energy || ""),
                pricePerKwh: String(pricePerKwh || ""),
                batteryStartPercent: String(parseLocalizedNumber(valueFor(csv.headers, row, "batteryStartPercent")) || ""),
                batteryEndPercent: String(parseLocalizedNumber(valueFor(csv.headers, row, "batteryEndPercent")) || ""),
                chargerType: valueFor(csv.headers, row, "chargerType"),
                chargingSpeedKw: String(parseLocalizedNumber(valueFor(csv.headers, row, "chargingSpeedKw")) || ""),
                efficiencyKwhPer100Km: String(parseLocalizedNumber(valueFor(csv.headers, row, "efficiencyKwhPer100Km")) || ""),
                importBatchId: batchId,
                externalId,
                parts: [],
            },
        });
    });
    return { expenses, rejected };
}
