export function isAccountDeletionRetryAuthorized(provided: string | null, expected: string | undefined) {
    if (!expected || !provided) return false;
    const left = new TextEncoder().encode(provided);
    const right = new TextEncoder().encode(expected);
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
    return difference === 0;
}
