import { isAppearancePreference, resolveAppearance } from "../appearance";

describe("appearance preferences", () => {
    it.each(["system", "light", "dark"] as const)("accepts the persisted %s preference", (value) => {
        expect(isAppearancePreference(value)).toBe(true);
    });

    it("rejects corrupt persisted values", () => {
        expect(isAppearancePreference("sepia")).toBe(false);
        expect(isAppearancePreference(null)).toBe(false);
    });

    it("follows the operating system only in system mode", () => {
        expect(resolveAppearance("system", "dark")).toBe("dark");
        expect(resolveAppearance("system", "light")).toBe("light");
        expect(resolveAppearance("light", "dark")).toBe("light");
        expect(resolveAppearance("dark", "light")).toBe("dark");
    });
});
