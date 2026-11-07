import type { RevenueCatCustomerSyncResult } from "./billing.ts";

export class RevenueCatDeletionInProgressError extends Error {}

export async function processRevenueCatWebhookUsers(
    userIds: string[],
    sync: (userId: string) => Promise<RevenueCatCustomerSyncResult>
) {
    let ignoredDeletedAccount = false;
    for (const userId of userIds) {
        const outcome = await sync(userId);
        // A tombstone without Auth confirmation is a live deletion
        // transaction. The caller must return non-2xx so RevenueCat retries
        // instead of falsely acknowledging an event for an active account.
        if (outcome.kind === "deletion_pending") {
            throw new RevenueCatDeletionInProgressError("Account deletion is still in progress.");
        }
        if (outcome.kind === "deleted") ignoredDeletedAccount = true;
    }
    return { ignoredDeletedAccount };
}
