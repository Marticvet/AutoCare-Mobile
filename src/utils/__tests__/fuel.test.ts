import {
    calculateFuelConsumption,
    parseLocalizedDecimal,
    updateFuelEntry,
} from "../fuel";

describe("fuel entry calculations", () => {
    test("accepts comma and point decimal input", () => {
        expect(parseLocalizedDecimal("48,25")).toBe(48.25);
        expect(parseLocalizedDecimal("1.739")).toBe(1.739);
        expect(parseLocalizedDecimal("1,234.56")).toBeNull();
        expect(parseLocalizedDecimal("not a number")).toBeNull();
    });

    test("derives total cost from litres and unit price", () => {
        const first = updateFuelEntry({ litres: "", amount: "", pricePerLitre: "" }, [], "litres", "48,25");
        const second = updateFuelEntry(first.values, first.explicitOrder, "pricePerLitre", "1.739");
        expect(second.values).toEqual({ litres: "48,25", amount: "83.91", pricePerLitre: "1.739" });
    });

    test("keeps the two latest explicit fields and derives the third", () => {
        const result = updateFuelEntry(
            { litres: "50", amount: "90", pricePerLitre: "1.8" },
            ["litres", "pricePerLitre", "amount"],
            "litres",
            "45"
        );
        expect(result.values.pricePerLitre).toBe("2");
        expect(result.values.amount).toBe("90");
    });
});

describe("fuel consumption", () => {
    test("excludes the baseline fill and includes intermediate partial fills", () => {
        const result = calculateFuelConsumption([
            { date: "2026-01-01", odometer: 10_000, total_litres: 50, full_tank: true },
            { date: "2026-01-15", odometer: 10_400, total_litres: 20, full_tank: false },
            { date: "2026-02-01", odometer: 10_900, total_litres: 40, full_tank: true },
        ]);
        expect(result.intervals).toHaveLength(1);
        expect(result.totalLitres).toBe(60);
        expect(result.totalDistance).toBe(900);
        expect(result.litresPer100Km).toBeCloseTo(6.6667, 4);
    });

    test("weights completed intervals and ignores an unfinished partial tail", () => {
        const result = calculateFuelConsumption([
            { date: "2026-01-01", odometer: 1_000, total_litres: 40, full_tank: "1" },
            { date: "2026-02-01", odometer: 1_500, total_litres: 35, full_tank: "true" },
            { date: "2026-03-01", odometer: 2_000, total_litres: 40, full_tank: "1" },
            { date: "2026-03-15", odometer: 2_200, total_litres: 99, full_tank: "0" },
        ]);
        expect(result.intervals).toHaveLength(2);
        expect(result.litresPer100Km).toBeCloseTo(7.5, 4);
    });

    test("sorts historical entries by service date and rejects unreliable odometers", () => {
        const result = calculateFuelConsumption([
            { date: "2026-03-01", odometer: 11_000, total_litres: 40, full_tank: true },
            { date: "2026-01-01", odometer: 10_000, total_litres: 50, full_tank: true },
            { date: "2026-02-01", odometer: 9_900, total_litres: 80, full_tank: false },
            { date: "2026-02-15", odometer: 10_000, total_litres: 80, full_tank: false },
        ]);
        expect(result.totalLitres).toBe(40);
        expect(result.totalDistance).toBe(1_000);
        expect(result.litresPer100Km).toBeCloseTo(4, 4);
    });

    test("does not combine different vehicles or show a value with one full tank", () => {
        expect(calculateFuelConsumption([
            { selected_vehicle_id: "one", odometer: 1_000, total_litres: 30, full_tank: true },
            { selected_vehicle_id: "two", odometer: 2_000, total_litres: 30, full_tank: true },
        ]).reason).toBe("mixed-vehicles");
        expect(calculateFuelConsumption([
            { odometer: 1_000, total_litres: 30, full_tank: true },
        ]).litresPer100Km).toBeNull();
    });
});
