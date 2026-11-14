import { ExpenseCategory } from "../data/models";

type ExpenseIconName =
    | "water-outline"
    | "flash-outline"
    | "construct-outline"
    | "shield-checkmark-outline"
    | "car-outline"
    | "trail-sign-outline"
    | "document-text-outline"
    | "sparkles-outline"
    | "hammer-outline"
    | "receipt-outline";

export type ExpenseCategoryPresentation = {
    category: ExpenseCategory;
    icon: ExpenseIconName;
    labelKey: ExpenseCategory;
};

const presentations: Record<ExpenseCategory, ExpenseCategoryPresentation> = {
    fuel: { category: "fuel", icon: "water-outline", labelKey: "fuel" },
    charging: { category: "charging", icon: "flash-outline", labelKey: "charging" },
    service: { category: "service", icon: "construct-outline", labelKey: "service" },
    insurance: { category: "insurance", icon: "shield-checkmark-outline", labelKey: "insurance" },
    parking: { category: "parking", icon: "car-outline", labelKey: "parking" },
    toll: { category: "toll", icon: "trail-sign-outline", labelKey: "toll" },
    tax: { category: "tax", icon: "document-text-outline", labelKey: "tax" },
    wash: { category: "wash", icon: "sparkles-outline", labelKey: "wash" },
    repair: { category: "repair", icon: "hammer-outline", labelKey: "repair" },
    other: { category: "other", icon: "receipt-outline", labelKey: "other" },
};

const legacyAliases: Record<string, ExpenseCategory> = {
    maintenance: "service",
    inspection: "service",
    tyres: "repair",
    tire: "repair",
    tires: "repair",
    cleaning: "wash",
    carwash: "wash",
    car_wash: "wash",
    receipt: "other",
};

/**
 * Database rows predate the current ExpenseCategory union, so presentation
 * must tolerate old, imported, and unknown category strings.
 */
export function expenseCategoryPresentation(category: unknown): ExpenseCategoryPresentation {
    const normalized = String(category ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
    const canonical = legacyAliases[normalized] ?? normalized;

    return presentations[canonical as ExpenseCategory] ?? presentations.other;
}
