export type AccountDeletionWorkflow = {
    createTombstone: () => Promise<"pending_auth_deletion" | "auth_deleted">;
    createQueue: () => Promise<void>;
    deleteAccountData: () => Promise<void>;
    deleteAuthUser: () => Promise<void>;
    confirmAuthUserDeleted: () => Promise<void>;
    markRevenueCatEligible: () => Promise<void>;
    requestRevenueCatDeletion: () => Promise<"confirmed" | "requested" | "pending" | "needs_attention">;
    rollbackPendingDeletion: () => Promise<void>;
};

export async function runAccountDeletionWorkflow(workflow: AccountDeletionWorkflow) {
    const tombstoneState = await workflow.createTombstone();
    if (tombstoneState === "auth_deleted") {
        throw new Error("This account has already been deleted.");
    }
    await workflow.createQueue();
    let authDeletionConfirmed = false;
    try {
        await workflow.deleteAccountData();
        await workflow.deleteAuthUser();
        await workflow.confirmAuthUserDeleted();
        authDeletionConfirmed = true;
        await workflow.markRevenueCatEligible();
        return await workflow.requestRevenueCatDeletion();
    } catch (error) {
        if (!authDeletionConfirmed) await workflow.rollbackPendingDeletion();
        throw error;
    }
}
