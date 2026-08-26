import { ExpenseRecord, ReminderRecord, ReminderState } from "../data/models";
import { FuelExpense } from "../powersync/AppSchema";

export const isoDate = (date = new Date()) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
};

export const isoTime = (date = new Date()) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const isIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && isoDate(date) === value;
};

export const isIsoTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const toNumber = (value: string | number | null | undefined) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};

export const addMonths = (dateValue: string, months: number) => {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setMonth(date.getMonth() + months);
    return isoDate(date);
};

export const getReminderState = (
    reminder: ReminderRecord,
    currentMileage = 0,
    now = new Date()
): ReminderState => {
    if (reminder.status === "completed") return "completed";

    const today = new Date(`${isoDate(now)}T00:00:00`).getTime();
    const dueDate = reminder.due_date
        ? new Date(`${reminder.due_date}T00:00:00`).getTime()
        : null;
    const days = dueDate === null ? null : Math.ceil((dueDate - today) / 86_400_000);
    const mileageLeft = reminder.due_mileage === null ? null : reminder.due_mileage - currentMileage;

    if ((days !== null && days < 0) || (mileageLeft !== null && mileageLeft <= 0)) return "overdue";
    if ((days !== null && days <= 30) || (mileageLeft !== null && mileageLeft <= 500)) return "dueSoon";
    return "upcoming";
};

export const calculateFuelEconomy = (rows: FuelExpense[]) => {
    const logs = rows
        .filter((row) => row.odometer && row.total_litres && (row.full_tank === "1" || row.full_tank === "true"))
        .sort((a, b) => (a.odometer ?? 0) - (b.odometer ?? 0));

    if (logs.length < 2) return null;

    let weightedDistance = 0;
    let consumedLitres = 0;
    for (let index = 1; index < logs.length; index += 1) {
        const distance = (logs[index].odometer ?? 0) - (logs[index - 1].odometer ?? 0);
        if (distance > 0) {
            weightedDistance += distance;
            consumedLitres += logs[index].total_litres ?? 0;
        }
    }

    return weightedDistance > 0 && consumedLitres > 0
        ? (consumedLitres / weightedDistance) * 100
        : null;
};

export const filterExpensesByDays = (expenses: ExpenseRecord[], days: number | null) => {
    if (days === null) return expenses;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = isoDate(cutoff);
    return expenses.filter((expense) => expense.date >= cutoffIso);
};

export type ExpensePeriod = "week" | "month" | "year" | "all" | "custom";

export type ExpenseDateRange = {
    start: string | null;
    end: string;
};

export const expenseDateRangeForPeriod = (
    period: Exclude<ExpensePeriod, "custom">,
    now = new Date()
): ExpenseDateRange => {
    const end = isoDate(now);
    if (period === "all") return { start: null, end };

    const start = new Date(now);
    if (period === "week") start.setDate(start.getDate() - 6);
    if (period === "month") start.setDate(1);
    if (period === "year") start.setMonth(0, 1);
    return { start: isoDate(start), end };
};

export const filterExpensesByRange = (
    expenses: ExpenseRecord[],
    start: string | null,
    end: string | null
) => expenses.filter((expense) => (!start || expense.date >= start) && (!end || expense.date <= end));

export type ExpenseTrendBucket = {
    start: string;
    end: string;
    total: number;
};

const addDays = (dateValue: string, days: number) => {
    const date = new Date(`${dateValue}T12:00:00`);
    date.setDate(date.getDate() + days);
    return isoDate(date);
};

const daysBetweenInclusive = (start: string, end: string) =>
    Math.max(1, Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000) + 1);

export const expenseTrendTotals = (
    expenses: ExpenseRecord[],
    requestedStart: string | null,
    requestedEnd: string
): ExpenseTrendBucket[] => {
    const validDates = expenses.map((expense) => expense.date).filter(isIsoDate).sort();
    const start = requestedStart ?? validDates[0] ?? requestedEnd;
    const end = requestedEnd < start ? start : requestedEnd;
    const dayCount = daysBetweenInclusive(start, end);
    const buckets: ExpenseTrendBucket[] = [];

    if (dayCount <= 31) {
        for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
            buckets.push({ start: cursor, end: cursor, total: 0 });
        }
    } else if (dayCount <= 180) {
        for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
            const bucketEnd = [addDays(cursor, 6), end].sort()[0];
            buckets.push({ start: cursor, end: bucketEnd, total: 0 });
        }
    } else {
        let cursor = new Date(`${start.slice(0, 7)}-01T12:00:00`);
        const finalMonth = end.slice(0, 7);
        while (isoDate(cursor).slice(0, 7) <= finalMonth) {
            const month = isoDate(cursor).slice(0, 7);
            const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
            const monthEnd = addDays(isoDate(nextMonth), -1);
            buckets.push({
                start: month === start.slice(0, 7) ? start : `${month}-01`,
                end: month === finalMonth ? end : monthEnd,
                total: 0,
            });
            cursor = nextMonth;
        }
    }

    for (const expense of expenses) {
        const bucket = buckets.find((entry) => expense.date >= entry.start && expense.date <= entry.end);
        if (bucket) bucket.total += toNumber(expense.amount);
    }
    return buckets;
};

export const totalExpenses = (expenses: ExpenseRecord[]) =>
    expenses.reduce((total, expense) => total + toNumber(expense.amount), 0);

const fuelEmissionFactor = (fuelType: string | null) => {
    const normalized = (fuelType ?? "").toLowerCase();
    if (normalized.includes("diesel")) return 2.68;
    if (normalized.includes("lpg") || normalized.includes("autogas")) return 1.51;
    if (normalized.includes("ethanol") || normalized.includes("e85")) return 1.61;
    if (normalized.includes("electric")) return 0;
    return 2.31;
};

export const estimateFuelCo2Kg = (expenses: ExpenseRecord[]) =>
    expenses
        .filter((expense) => expense.category === "fuel")
        .reduce(
            (total, expense) => total + toNumber(expense.litres) * fuelEmissionFactor(expense.fuel_type),
            0
        );

export const groupExpenseTotals = (expenses: ExpenseRecord[]) =>
    expenses.reduce<Record<string, number>>((totals, expense) => {
        totals[expense.category] = (totals[expense.category] ?? 0) + toNumber(expense.amount);
        return totals;
    }, {});

export const monthlyExpenseTotals = (expenses: ExpenseRecord[], months = 6) => {
    const result: { month: string; total: number }[] = [];
    const current = new Date();
    for (let offset = months - 1; offset >= 0; offset -= 1) {
        const date = new Date(current.getFullYear(), current.getMonth() - offset, 1);
        const month = isoDate(date).slice(0, 7);
        result.push({
            month,
            total: expenses
                .filter((expense) => expense.date.startsWith(month))
                .reduce((sum, expense) => sum + toNumber(expense.amount), 0),
        });
    }
    return result;
};

export const csvEscape = (value: unknown) => {
    const stringValue = String(value ?? "");
    return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
};

export const expensesToCsv = (expenses: ExpenseRecord[], currency: string) => {
    const header = ["date", "category", "title", `amount_${currency}`, "odometer", "place", "payment_method", "notes"];
    const rows = expenses.map((expense) =>
        [expense.date, expense.category, expense.title, expense.amount, expense.odometer, expense.place, expense.payment_method, expense.notes]
            .map(csvEscape)
            .join(",")
    );
    return [header.join(","), ...rows].join("\n");
};
