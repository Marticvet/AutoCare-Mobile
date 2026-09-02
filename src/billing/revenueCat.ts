import { Platform } from "react-native";
import Purchases, {
    LOG_LEVEL,
    type CustomerInfo,
    type PurchasesOffering,
    type PurchasesPackage,
} from "react-native-purchases";

let configuredUserId: string | null = null;

export function revenueCatPublicApiKey() {
    const testStoreKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim() ?? "";
    const platformKey = Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? ""
        : Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? ""
            : "";

    if (__DEV__) return testStoreKey || platformKey;
    // RevenueCat explicitly prohibits shipping Test Store keys. Refuse to
    // configure purchases if a release build is accidentally given one.
    return platformKey.startsWith("test_") ? "" : platformKey;
}

export async function configureRevenueCat(userId: string) {
    const apiKey = revenueCatPublicApiKey();
    if (!apiKey || !userId) return false;

    const configured = await Purchases.isConfigured();
    if (!configured) {
        Purchases.configure({ apiKey, appUserID: userId });
        if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        configuredUserId = userId;
        return true;
    }

    const activeUserId = await Purchases.getAppUserID();
    if (activeUserId !== userId) await Purchases.logIn(userId);
    configuredUserId = userId;
    return true;
}

export async function clearRevenueCatUser() {
    if (!(await Purchases.isConfigured()) || !configuredUserId) return;
    await Purchases.logOut();
    configuredUserId = null;
}

export async function loadRevenueCatState(): Promise<{
    customerInfo: CustomerInfo;
    currentOffering: PurchasesOffering | null;
}> {
    const [customerInfo, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
    ]);
    return { customerInfo, currentOffering: offerings.current };
}

export async function purchaseRevenueCatPackage(selectedPackage: PurchasesPackage) {
    return Purchases.purchasePackage(selectedPackage);
}

export async function restoreRevenueCatPurchases() {
    return Purchases.restorePurchases();
}

export async function openRevenueCatSubscriptionManagement() {
    return Purchases.showManageSubscriptions();
}

export { Purchases };
