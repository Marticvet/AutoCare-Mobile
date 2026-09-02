import { mapCsvExpenses, parseCsv, parseImportDate, parseLocalizedNumber } from "../csvImport";

describe("CSV expense import", () => {
    test("parses quoted semicolon-delimited exports", () => {
        const csv = parseCsv('Date;Total cost;Liters;Station;Notes\n25.08.2026;"68,50";"42,1";Shell;"Trip, summer"');
        expect(csv.delimiter).toBe(";");
        expect(csv.headers).toEqual(["date", "total_cost", "liters", "station", "notes"]);
        expect(csv.rows[0][4]).toBe("Trip, summer");
    });

    test("handles European and international numbers", () => {
        expect(parseLocalizedNumber("€1.234,56")).toBeCloseTo(1234.56);
        expect(parseLocalizedNumber("1,234.56 USD")).toBeCloseTo(1234.56);
    });

    test("parses valid dates and rejects impossible dates", () => {
        expect(parseImportDate("25/08/2026", "fuelio")).toBe("2026-08-25");
        expect(parseImportDate("08/25/2026", "generic")).toBe("2026-08-25");
        expect(parseImportDate("31/02/2026", "drivvo")).toBe("");
    });

    test("maps fuel and charging records and reports invalid rows", () => {
        const csv = parseCsv([
            "date,category,total_cost,litres,price_per_litre,energy_kwh,price_per_kwh,station",
            "2026-08-25,Fuel,50,25,2,,,Station A",
            "2026-08-26,Charging,20,,,40,0.5,Charger B",
            "not-a-date,Other,10,,,,,Shop",
        ].join("\n"));
        const result = mapCsvExpenses({ csv, source: "generic", userId: "user", vehicleId: "vehicle", batchId: "batch" });
        expect(result.expenses).toHaveLength(2);
        expect(result.expenses[0].draft.category).toBe("fuel");
        expect(result.expenses[1].draft.category).toBe("charging");
        expect(result.rejected).toEqual([{ rowNumber: 4, reason: "Date could not be recognized" }]);
    });
});
