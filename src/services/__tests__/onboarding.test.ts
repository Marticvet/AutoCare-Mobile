import AsyncStorage from "@react-native-async-storage/async-storage";
import { completeOnboarding, hasCompletedOnboarding, ONBOARDING_STORAGE_KEY } from "../onboarding";

jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

describe("onboarding persistence", () => {
    beforeEach(() => jest.clearAllMocks());

    it("is incomplete until the versioned marker is present", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce("complete");
        await expect(hasCompletedOnboarding()).resolves.toBe(false);
        await expect(hasCompletedOnboarding()).resolves.toBe(true);
        expect(AsyncStorage.getItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY);
    });

    it("persists completion", async () => {
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        await completeOnboarding();
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY, "complete");
    });
});
