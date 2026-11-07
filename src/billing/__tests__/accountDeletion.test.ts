import { deleteAccountWithRevenueCatCleanup } from "../accountDeletion";

describe("mobile account deletion RevenueCat cleanup", () => {
    it("logs out the native customer before the remote deletion can remove it", async () => {
        const steps: string[] = [];

        await expect(deleteAccountWithRevenueCatCleanup({
            clearRevenueCatUser: async () => { steps.push("revenuecat-logout"); },
            deleteAccount: async () => { steps.push("delete-account"); return { deleted: true }; },
            restoreRevenueCatUser: async () => { steps.push("restore"); },
        })).resolves.toEqual({ deleted: true });

        expect(steps).toEqual(["revenuecat-logout", "delete-account"]);
    });

    it("restores the signed-in customer if remote deletion does not succeed", async () => {
        const deletionError = new Error("delete-account unavailable");
        const steps: string[] = [];

        await expect(deleteAccountWithRevenueCatCleanup({
            clearRevenueCatUser: async () => { steps.push("revenuecat-logout"); },
            deleteAccount: async () => { steps.push("delete-account"); throw deletionError; },
            restoreRevenueCatUser: async () => { steps.push("restore"); },
        })).rejects.toBe(deletionError);

        expect(steps).toEqual(["revenuecat-logout", "delete-account", "restore"]);
    });

    it("does not restore a RevenueCat identity when Auth deletion may already have occurred", async () => {
        const deletionError = new Error("Account deletion state unknown");
        const restoreRevenueCatUser = jest.fn();

        await expect(deleteAccountWithRevenueCatCleanup({
            clearRevenueCatUser: async () => undefined,
            deleteAccount: async () => { throw deletionError; },
            restoreRevenueCatUser,
            shouldRestoreRevenueCatUser: () => false,
        })).rejects.toBe(deletionError);

        expect(restoreRevenueCatUser).not.toHaveBeenCalled();
    });
});
