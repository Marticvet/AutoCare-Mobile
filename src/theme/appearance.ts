export type AppearancePreference = "system" | "light" | "dark";

export function isAppearancePreference(value: unknown): value is AppearancePreference {
    return value === "system" || value === "light" || value === "dark";
}

export function resolveAppearance(
    preference: AppearancePreference,
    systemAppearance: "light" | "dark" | null | undefined
): "light" | "dark" {
    if (preference !== "system") return preference;
    return systemAppearance === "dark" ? "dark" : "light";
}
