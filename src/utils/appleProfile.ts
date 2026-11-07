export type AppleProfileNamePatch = {
    full_name: string;
    first_name: string;
    last_name: string;
};

// Used in the profile update filter so a name already provided in AutoCare is
// never replaced by the one-time name returned from Apple.
export const EMPTY_PROFILE_NAME_FILTER = "full_name.is.null,full_name.eq.";

export function appleFirstLoginProfileNamePatch(suppliedName?: string): AppleProfileNamePatch | null {
    const fullName = suppliedName?.trim();
    if (!fullName) return null;

    const [firstName = "", ...remainingName] = fullName.split(/\s+/);
    return {
        full_name: fullName,
        first_name: firstName,
        last_name: remainingName.join(" "),
    };
}
