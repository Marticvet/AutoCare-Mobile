/**
 * Reset the device's RevenueCat identity before server-side account deletion
 * starts. The deletion endpoint can remove the custom App User ID before its
 * HTTP response reaches the device, so waiting to log out until after that
 * response leaves native SDK work targeting a deleted subscriber.
 */
export async function deleteAccountWithRevenueCatCleanup<T>(input: {
    deleteAccount: () => Promise<T>;
    clearRevenueCatUser: () => Promise<void>;
    restoreRevenueCatUser: () => Promise<unknown>;
    shouldRestoreRevenueCatUser?: (error: unknown) => boolean;
}): Promise<T> {
    await input.clearRevenueCatUser();
    try {
        return await input.deleteAccount();
    } catch (error) {
        // The cloud account still exists if its deletion request failed, so
        // restore its known custom App User ID rather than leaving this signed-
        // in user on RevenueCat's anonymous identity.
        if (input.shouldRestoreRevenueCatUser?.(error) ?? true) {
            await input.restoreRevenueCatUser();
        }
        throw error;
    }
}
