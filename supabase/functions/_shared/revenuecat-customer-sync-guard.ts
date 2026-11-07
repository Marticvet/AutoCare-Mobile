export type RevenueCatDeletionSyncState = "none" | "pending_auth_deletion" | "auth_deleted";
export type RevenueCatCustomerSyncDisposition = "sync" | "deletion_pending" | "deleted";

export function revenueCatCustomerSyncDisposition(state: RevenueCatDeletionSyncState): RevenueCatCustomerSyncDisposition {
    if (state === "pending_auth_deletion") return "deletion_pending";
    if (state === "auth_deleted") return "deleted";
    return "sync";
}
