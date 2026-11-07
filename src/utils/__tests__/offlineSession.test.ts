import { signOutAndClearOfflineData } from "../offlineSession";

describe("offline session clearing", () => {
    it("clears cached PowerSync data when local sign-out fails", async () => {
        const clearOfflineData = jest.fn().mockResolvedValue(undefined);

        await expect(signOutAndClearOfflineData(
            async () => {
                throw new Error("local_sign_out_failed");
            },
            clearOfflineData
        )).rejects.toThrow("local_sign_out_failed");

        expect(clearOfflineData).toHaveBeenCalledTimes(1);
    });

    it("clears cached PowerSync data when Supabase returns a sign-out error", async () => {
        const clearOfflineData = jest.fn().mockResolvedValue(undefined);

        await expect(signOutAndClearOfflineData(
            async () => ({ error: new Error("local_sign_out_rejected") }),
            clearOfflineData
        )).rejects.toThrow("local_sign_out_rejected");

        expect(clearOfflineData).toHaveBeenCalledTimes(1);
    });

    it("clears cached data after successful local sign-out", async () => {
        const clearOfflineData = jest.fn().mockResolvedValue(undefined);

        await signOutAndClearOfflineData(
            async () => ({ error: null }),
            clearOfflineData
        );

        expect(clearOfflineData).toHaveBeenCalledTimes(1);
    });
});
