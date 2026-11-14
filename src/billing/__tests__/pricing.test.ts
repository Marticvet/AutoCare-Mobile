import type { PurchasesPackage } from "react-native-purchases";
import { annualSavingsPercent } from "../pricing";

const productPackage = (period: "MONTHLY" | "ANNUAL", price: number, currencyCode = "EUR") => ({
    packageType: period,
    identifier: period.toLowerCase(),
    product: { identifier: period.toLowerCase(), price, currencyCode },
}) as PurchasesPackage;

describe("dynamic subscription pricing", () => {
    it("calculates annual savings from comparable store prices", () => {
        expect(annualSavingsPercent([
            productPackage("MONTHLY", 4.99),
            productPackage("ANNUAL", 39.99),
        ])).toBe(33);
    });

    it("does not claim savings for missing, incompatible, or more expensive products", () => {
        expect(annualSavingsPercent([productPackage("ANNUAL", 39.99)])).toBeNull();
        expect(annualSavingsPercent([
            productPackage("MONTHLY", 4.99, "EUR"),
            productPackage("ANNUAL", 39.99, "USD"),
        ])).toBeNull();
        expect(annualSavingsPercent([
            productPackage("MONTHLY", 4.99),
            productPackage("ANNUAL", 70),
        ])).toBeNull();
    });
});
