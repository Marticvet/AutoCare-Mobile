export const DELETION_QUEUE_ALERT_AFTER_MS = 24 * 60 * 60 * 1000;

export type RevenueCatDeletionQueueHealthRow = {
    status: "awaiting_auth_deletion" | "queued" | "processing" | "requested" | "confirmed" | "failed";
    created_at: string;
};

export function revenueCatDeletionQueueHealth(
    rows: RevenueCatDeletionQueueHealthRow[],
    now = Date.now()
) {
    const actionable = rows.filter((row) => ["queued", "processing", "requested"].includes(row.status));
    const oldestActionableAgeMs = actionable.reduce((oldest, row) => {
        const age = Math.max(0, now - new Date(row.created_at).getTime());
        return Math.max(oldest, age);
    }, 0);
    const failed = rows.filter((row) => row.status === "failed").length;
    return {
        failed,
        pending: actionable.length,
        oldestActionableAgeMs,
        needsAttention: failed > 0 || oldestActionableAgeMs > DELETION_QUEUE_ALERT_AFTER_MS,
    };
}
