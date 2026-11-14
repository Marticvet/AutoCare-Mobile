import { ExpenseRecord } from "../data/models";
import { calculateFuelConsumption } from "./fuel";

export type ReportStatistics = {
    fuel: {
        fillUps: number;
        litres: number;
        consumption: number | null;
        bestConsumption: number | null;
        worstConsumption: number | null;
        effectivePrice: number | null;
        lowestPrice: number | null;
        highestPrice: number | null;
        smallestFill: number | null;
        largestFill: number | null;
    };
    costs: {
        total: number;
        fuel: number;
        service: number;
        repair: number;
        insurance: number;
        other: number;
        lowest: number | null;
        highest: number | null;
    };
    distance: {
        latestOdometer: number | null;
        recorded: number;
        averageDaily: number | null;
    };
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const validPositive = (value: number | null | undefined) => Number.isFinite(value) && Number(value) > 0;

export function calculateReportStatistics(expenses: ExpenseRecord[]): ReportStatistics {
    const fuelRows = expenses.filter((expense) => expense.category === "fuel" && validPositive(expense.litres));
    const litres = fuelRows.map((expense) => Number(expense.litres));
    const prices = fuelRows.map((expense) => Number(expense.price_per_litre)).filter(validPositive);
    const fuelConsumption = calculateFuelConsumption(fuelRows.map((expense) => ({
        id: expense.id,
        selected_vehicle_id: expense.vehicle_id,
        odometer: expense.odometer,
        total_litres: expense.litres,
        full_tank: expense.full_tank,
        date: expense.date,
        time: expense.time,
    })));
    const intervals = fuelConsumption.intervals.map((interval) => interval.litresPer100Km);
    const fuelCost = sum(fuelRows.map((expense) => Number(expense.amount) || 0));
    const totalLitres = sum(litres);

    const amounts = expenses.map((expense) => Number(expense.amount)).filter(validPositive);
    const categoryCost = (category: ExpenseRecord["category"]) =>
        sum(expenses.filter((expense) => expense.category === category).map((expense) => Number(expense.amount) || 0));
    const knownCost = ["fuel", "service", "repair", "insurance"] as const;
    const totalCost = sum(amounts);

    const odometersByVehicle = new Map<string, { value: number; date: string }[]>();
    for (const expense of expenses) {
        if (!expense.vehicle_id || !validPositive(expense.odometer)) continue;
        const entries = odometersByVehicle.get(expense.vehicle_id) ?? [];
        entries.push({ value: Number(expense.odometer), date: expense.date });
        odometersByVehicle.set(expense.vehicle_id, entries);
    }
    let recordedDistance = 0;
    for (const entries of odometersByVehicle.values()) {
        if (entries.length < 2) continue;
        const values = entries.map((entry) => entry.value);
        recordedDistance += Math.max(...values) - Math.min(...values);
    }
    let latestOdometer: number | null = null;
    let averageDaily: number | null = null;
    if (odometersByVehicle.size === 1) {
        const entries = [...odometersByVehicle.values()][0].sort((a, b) => a.date.localeCompare(b.date));
        latestOdometer = entries.at(-1)?.value ?? null;
        if (entries.length >= 2 && recordedDistance > 0) {
            const first = new Date(`${entries[0].date}T12:00:00`).getTime();
            const last = new Date(`${entries.at(-1)?.date}T12:00:00`).getTime();
            const days = Math.max(1, Math.round((last - first) / 86_400_000));
            averageDaily = recordedDistance / days;
        }
    }

    return {
        fuel: {
            fillUps: fuelRows.length,
            litres: totalLitres,
            consumption: fuelConsumption.litresPer100Km,
            bestConsumption: intervals.length ? Math.min(...intervals) : null,
            worstConsumption: intervals.length ? Math.max(...intervals) : null,
            effectivePrice: totalLitres > 0 && fuelCost > 0 ? fuelCost / totalLitres : null,
            lowestPrice: prices.length ? Math.min(...prices) : null,
            highestPrice: prices.length ? Math.max(...prices) : null,
            smallestFill: litres.length ? Math.min(...litres) : null,
            largestFill: litres.length ? Math.max(...litres) : null,
        },
        costs: {
            total: totalCost,
            fuel: categoryCost("fuel"),
            service: categoryCost("service"),
            repair: categoryCost("repair"),
            insurance: categoryCost("insurance"),
            other: sum(expenses.filter((expense) => !knownCost.includes(expense.category as typeof knownCost[number])).map((expense) => Number(expense.amount) || 0)),
            lowest: amounts.length ? Math.min(...amounts) : null,
            highest: amounts.length ? Math.max(...amounts) : null,
        },
        distance: { latestOdometer, recorded: recordedDistance, averageDaily },
    };
}
