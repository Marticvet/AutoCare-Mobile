import {
    EMPTY_PROFILE_NAME_FILTER,
    appleFirstLoginProfileNamePatch,
} from "../appleProfile";

describe("Apple first-login profile names", () => {
    it("normalizes the one-time Apple name for a blank profile", () => {
        expect(appleFirstLoginProfileNamePatch("  Ada  Lovelace  ")).toEqual({
            full_name: "Ada  Lovelace",
            first_name: "Ada",
            last_name: "Lovelace",
        });
    });

    it("does nothing when Apple does not provide a first-login name", () => {
        expect(appleFirstLoginProfileNamePatch(undefined)).toBeNull();
        expect(appleFirstLoginProfileNamePatch("   ")).toBeNull();
    });

    it("uses an atomic blank-name-only filter so an existing profile name wins", () => {
        expect(EMPTY_PROFILE_NAME_FILTER).toBe("full_name.is.null,full_name.eq.");
    });
});
