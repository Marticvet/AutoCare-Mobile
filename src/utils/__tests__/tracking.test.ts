import { ExpenseRecord, ReminderRecord } from "../../data/models";
import { FuelExpense } from "../../powersync/AppSchema";
import {
    calculateFuelEconomy,
    estimateFuelCo2Kg,
    expensesToCsv,
    expenseDateRangeForPeriod,
    expenseTrendTotals,
    filterExpensesByDays,
    filterExpensesByRange,
    getReminderState,
    groupExpenseTotals,
    isIsoDate,
    isIsoTime,
    totalExpenses,
} from "../tracking";

const expense = (overrides: Partial<ExpenseRecord>): ExpenseRecord => ({
    id: "expense-1",
    source: "general",
    category: "other",
    title: "Expense",
    amount: 10,
    date: "2026-08-25",
    time: null,
    odometer: null,
    place: null,
    payment_method: null,
    notes: null,
    vehicle_id: "vehicle-1",
    user_id: "user-1",
    litres: null,
    price_per_litre: null,
    fuel_type: null,
    full_tank: false,
    valid_to: null,
    ...overrides,
});

const reminder = (overrides: Partial<ReminderRecord>): ReminderRecord => ({
    id: "reminder-1",
    user_id: "user-1",
    vehicle_id: "vehicle-1",
    title: "Oil change",
    category: "maintenance",
    due_date: null,
    due_time: "09:00",
    due_mileage: null,
    repeat_months: null,
    repeat_km: null,
    priority: "medium",
    status: "active",
    notes: null,
    completed_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    related_document_id: null,
    ...overrides,
});

describe("tracking calculations", () => {
    test("validates real ISO calendar dates", () => {
        expect(isIsoDate("2024-02-29")).toBe(true);
        expect(isIsoDate("2025-02-29")).toBe(false);
        expect(isIsoDate("25-08-2026")).toBe(false);
    });

    test("validates 24-hour notification times", () => {
        expect(isIsoTime("00:00")).toBe(true);
        expect(isIsoTime("23:59")).toBe(true);
        expect(isIsoTime("24:00")).toBe(false);
        expect(isIsoTime("9:00")).toBe(false);
    });

    test("combines date and mileage reminder due states", () => {
        const now = new Date("2026-08-25T12:00:00Z");
        expect(getReminderState(reminder({ due_date: "2026-08-24" }), 10_000, now)).toBe("overdue");
        expect(getReminderState(reminder({ due_mileage: 10_400 }), 10_000, now)).toBe("dueSoon");
        expect(getReminderState(reminder({ due_date: "2027-01-01", due_mileage: 20_000 }), 10_000, now)).toBe("upcoming");
        expect(getReminderState(reminder({ status: "completed" }), 10_000, now)).toBe("completed");
    });

    test("calculates full-to-full fuel consumption", () => {
        const logs = [
            { odometer: 10_000, total_litres: 40, full_tank: "1" },
            { odometer: 10_500, total_litres: 35, full_tank: "1" },
            { odometer: 11_000, total_litres: 40, full_tank: "1" },
        ] as FuelExpense[];
        expect(calculateFuelEconomy(logs)).toBeCloseTo(7.5, 4);
    });

    test("totals and groups expense categories", () => {
        const rows = [expense({ amount: 20, category: "fuel" }), expense({ id: "expense-2", amount: 30, category: "fuel" }), expense({ id: "expense-3", amount: 15, category: "service" })];
        expect(totalExpenses(rows)).toBe(65);
        expect(groupExpenseTotals(rows)).toEqual({ fuel: 50, service: 15 });
    });

    test("estimates tailpipe emissions from fuel volume and type", () => {
        const rows = [
            expense({ category: "fuel", litres: 10, fuel_type: "Gasoline" }),
            expense({ id: "diesel", category: "fuel", litres: 5, fuel_type: "Diesel" }),
            expense({ id: "service", category: "service", litres: 99 }),
        ];
        expect(estimateFuelCo2Kg(rows)).toBeCloseTo(36.5, 4);
    });

    test("filters recent records and produces escaped CSV", () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-08-25T12:00:00Z"));
        const rows = [expense({ title: "Fuel, premium", notes: "line 1\nline 2" }), expense({ id: "old", date: "2025-01-01" })];
        expect(filterExpensesByDays(rows, 30)).toHaveLength(1);
        expect(expensesToCsv(rows.slice(0, 1), "EUR")).toContain('"Fuel, premium"');
        expect(expensesToCsv(rows.slice(0, 1), "EUR")).toContain('"line 1\nline 2"');
        jest.useRealTimers();
    });

    test("resolves week, month, and year ranges", () => {
        const now = new Date("2026-08-26T12:00:00");
        expect(expenseDateRangeForPeriod("week", now)).toEqual({ start: "2026-08-20", end: "2026-08-26" });
        expect(expenseDateRangeForPeriod("month", now)).toEqual({ start: "2026-08-01", end: "2026-08-26" });
        expect(expenseDateRangeForPeriod("year", now)).toEqual({ start: "2026-01-01", end: "2026-08-26" });
        expect(expenseDateRangeForPeriod("all", now)).toEqual({ start: null, end: "2026-08-26" });
    });

    test("filters inclusively and builds trend buckets for the selected range", () => {
        const rows = [
            expense({ id: "before", date: "2026-08-19", amount: 50 }),
            expense({ id: "start", date: "2026-08-20", amount: 20 }),
            expense({ id: "end", date: "2026-08-26", amount: 30 }),
        ];
        const filtered = filterExpensesByRange(rows, "2026-08-20", "2026-08-26");
        expect(filtered.map((row) => row.id)).toEqual(["start", "end"]);
        const trend = expenseTrendTotals(filtered, "2026-08-20", "2026-08-26");
        expect(trend).toHaveLength(7);
        expect(trend[0]).toMatchObject({ start: "2026-08-20", total: 20 });
        expect(trend[6]).toMatchObject({ end: "2026-08-26", total: 30 });
    });
});
