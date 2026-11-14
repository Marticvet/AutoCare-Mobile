import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_STORAGE_KEY = "@autocare/onboarding-v1";

export async function hasCompletedOnboarding() {
    try {
        return (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === "complete";
    } catch {
        return false;
    }
}

export async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
}
