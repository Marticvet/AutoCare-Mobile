import { ExpenseRecord } from "../../data/models";
import { calculateReportStatistics } from "../reportStatistics";

const expense = (overrides: Partial<ExpenseRecord>): ExpenseRecord => ({
    id: Math.random().toString(), source: "general", category: "other", title: "Expense", amount: 10,
    date: "2026-01-01", time: null, odometer: null, place: null, payment_method: null, notes: null,
    vehicle_id: "vehicle-1", user_id: "user-1", litres: null, price_per_litre: null, fuel_type: null,
    full_tank: false, valid_to: null, latitude: null, longitude: null, energy_kwh: null, price_per_kwh: null,
    battery_start_percent: null, battery_end_percent: null, charger_type: null, charging_speed_kw: null,
    efficiency_kwh_per_100km: null, import_batch_id: null, external_id: null, ...overrides,
});

describe("report statistics", () => {
    it("calculates fuel and cost measures without counting the baseline fill as consumed fuel", () => {
        const result = calculateReportStatistics([
            expense({ id: "a", source: "fuel", category: "fuel", date: "2026-01-01", odometer: 10_000, litres: 50, amount: 85, price_per_litre: 1.7, full_tank: true }),
            expense({ id: "b", source: "fuel", category: "fuel", date: "2026-01-15", odometer: 10_400, litres: 20, amount: 36, price_per_litre: 1.8, full_tank: false }),
            expense({ id: "c", source: "fuel", category: "fuel", date: "2026-02-01", odometer: 10_900, litres: 40, amount: 68, price_per_litre: 1.7, full_tank: true }),
            expense({ id: "d", category: "service", amount: 200 }),
        ]);
        expect(result.fuel.fillUps).toBe(3);
        expect(result.fuel.litres).toBe(110);
        expect(result.fuel.consumption).toBeCloseTo(6.6667, 4);
        expect(result.costs.total).toBe(389);
        expect(result.costs.fuel).toBe(189);
        expect(result.costs.service).toBe(200);
    });

    it("sums distance per vehicle without exposing a misleading combined latest odometer", () => {
        const result = calculateReportStatistics([
            expense({ vehicle_id: "one", date: "2026-01-01", odometer: 1_000 }),
            expense({ vehicle_id: "one", date: "2026-01-11", odometer: 1_500 }),
            expense({ vehicle_id: "two", date: "2026-01-01", odometer: 50_000 }),
            expense({ vehicle_id: "two", date: "2026-01-11", odometer: 50_300 }),
        ]);
        expect(result.distance.recorded).toBe(800);
        expect(result.distance.latestOdometer).toBeNull();
        expect(result.distance.averageDaily).toBeNull();
    });

    it("calculates latest and average daily distance for one vehicle", () => {
        const result = calculateReportStatistics([
            expense({ date: "2026-01-01", odometer: 1_000 }),
            expense({ date: "2026-01-11", odometer: 1_500 }),
        ]);
        expect(result.distance.latestOdometer).toBe(1_500);
        expect(result.distance.recorded).toBe(500);
        expect(result.distance.averageDaily).toBe(50);
    });
});
