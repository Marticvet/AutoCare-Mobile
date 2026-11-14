import { expenseCategoryPresentation } from "../expenseCategory";

describe("expenseCategoryPresentation", () => {
    it.each([
        ["fuel", "water-outline", "fuel"],
        ["charging", "flash-outline", "charging"],
        ["service", "construct-outline", "service"],
        ["insurance", "shield-checkmark-outline", "insurance"],
        ["parking", "car-outline", "parking"],
        ["toll", "trail-sign-outline", "toll"],
        ["tax", "document-text-outline", "tax"],
        ["wash", "sparkles-outline", "wash"],
        ["repair", "hammer-outline", "repair"],
        ["other", "receipt-outline", "other"],
    ])("maps %s to a visible icon and label", (category, icon, labelKey) => {
        expect(expenseCategoryPresentation(category)).toMatchObject({ icon, labelKey });
    });

    it.each([
        ["maintenance", "service"],
        ["inspection", "service"],
        ["tyres", "repair"],
        ["cleaning", "wash"],
        ["Car wash", "wash"],
        ["receipt", "other"],
    ])("normalizes legacy %s categories", (category, labelKey) => {
        expect(expenseCategoryPresentation(category)).toMatchObject({ labelKey });
    });

    it("uses the Other icon and label for unknown categories", () => {
        expect(expenseCategoryPresentation("legacy_vendor_fee")).toEqual({
            category: "other",
            icon: "receipt-outline",
            labelKey: "other",
        });
    });
});
