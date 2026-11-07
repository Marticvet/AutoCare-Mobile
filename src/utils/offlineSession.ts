type LocalSignOutResult = { error?: Error | null };

/**
 * A device's PowerSync database is scoped to its signed-in account. Clear it
 * even if Supabase cannot complete the local sign-out so a later account
 * cannot read or upload another account's cached rows.
 */
export async function signOutAndClearOfflineData(
    signOut: () => Promise<LocalSignOutResult>,
    clearOfflineData: () => Promise<void>
) {
    try {
        const { error } = await signOut();
        if (error) throw error;
    } finally {
        await clearOfflineData();
    }
}
