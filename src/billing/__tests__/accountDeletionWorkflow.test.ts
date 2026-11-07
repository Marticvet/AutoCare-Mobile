import { runAccountDeletionWorkflow } from "../../../supabase/functions/_shared/account-deletion-workflow";

describe("account deletion ordering", () => {
    it("does not request RevenueCat deletion until Auth deletion is confirmed", async () => {
        const steps: string[] = [];
        const result = await runAccountDeletionWorkflow({
            createTombstone: async () => { steps.push("tombstone"); return "pending_auth_deletion"; },
            createQueue: async () => { steps.push("queue"); },
            deleteAccountData: async () => { steps.push("data"); },
            deleteAuthUser: async () => { steps.push("delete-auth"); },
            confirmAuthUserDeleted: async () => { steps.push("confirm-auth"); },
            markRevenueCatEligible: async () => { steps.push("eligible"); },
            requestRevenueCatDeletion: async () => { steps.push("revenuecat"); return "requested"; },
            rollbackPendingDeletion: async () => { steps.push("rollback"); },
        });
        expect(result).toBe("requested");
        expect(steps).toEqual(["tombstone", "queue", "data", "delete-auth", "confirm-auth", "eligible", "revenuecat"]);
    });

    it("removes pending queue state and never calls RevenueCat when Auth deletion fails", async () => {
        const rollbackPendingDeletion = jest.fn();
        const requestRevenueCatDeletion = jest.fn();
        await expect(runAccountDeletionWorkflow({
            createTombstone: async () => "pending_auth_deletion",
            createQueue: async () => undefined,
            deleteAccountData: async () => undefined,
            deleteAuthUser: async () => { throw new Error("auth unavailable"); },
            confirmAuthUserDeleted: async () => undefined,
            markRevenueCatEligible: async () => undefined,
            requestRevenueCatDeletion,
            rollbackPendingDeletion,
        })).rejects.toThrow("auth unavailable");
        expect(rollbackPendingDeletion).toHaveBeenCalledTimes(1);
        expect(requestRevenueCatDeletion).not.toHaveBeenCalled();
    });

    it("does not report success or delete Auth when owned-data cleanup fails", async () => {
        const deleteAuthUser = jest.fn();
        const requestRevenueCatDeletion = jest.fn();
        const rollbackPendingDeletion = jest.fn();
        await expect(runAccountDeletionWorkflow({
            createTombstone: async () => "pending_auth_deletion",
            createQueue: async () => undefined,
            // This represents a failed storage cleanup for an account that
            // owns vehicles, expenses, or documents.
            deleteAccountData: async () => { throw new Error("owned data cleanup failed"); },
            deleteAuthUser,
            confirmAuthUserDeleted: async () => undefined,
            markRevenueCatEligible: async () => undefined,
            requestRevenueCatDeletion,
            rollbackPendingDeletion,
        })).rejects.toThrow("owned data cleanup failed");
        expect(deleteAuthUser).not.toHaveBeenCalled();
        expect(requestRevenueCatDeletion).not.toHaveBeenCalled();
        expect(rollbackPendingDeletion).toHaveBeenCalledTimes(1);
    });
});
