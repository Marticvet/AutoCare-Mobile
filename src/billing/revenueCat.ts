import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases, {
    LOG_LEVEL,
    type CustomerInfo,
    type PurchasesOffering,
    type PurchasesPackage,
} from "react-native-purchases";

// Purchases SDK calls mutate process-wide native state. React auth transitions
// can briefly overlap (for example, sign-out followed by a new sign-in), so
// serialize them to prevent a delayed logout clearing the newly configured
// customer or a request continuing after deletion cleanup.
let purchasesOperation: Promise<void> = Promise.resolve();
let developmentLogHandlerInstalled = false;

function withSerializedPurchases<T>(operation: () => Promise<T>): Promise<T> {
    const next = purchasesOperation.then(operation, operation);
    purchasesOperation = next.then(() => undefined, () => undefined);
    return next;
}

/** Keeps device logs useful for deletion diagnosis without disclosing PII or identifiers. */
export function sanitizeRevenueCatLog(message: string) {
    return message
        .replace(/\$RCAnonymousID:[a-z0-9-]+/gi, "$RCAnonymousID:[redacted]")
        .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, "[redacted-uuid]")
        .replace(/(App User ID:\s*)[^\s\n]+/gi, "$1[redacted]")
        .replace(/(\b(?:api[_-]?key|authorization|token|password|email|app_user_id)=)[^&\s]+/gi, "$1[redacted]")
        .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, "[redacted-email]");
}

function installDevelopmentRevenueCatLogHandler() {
    if (!__DEV__ || developmentLogHandlerInstalled) return;
    developmentLogHandlerInstalled = true;
    Purchases.setLogHandler((level, message) => {
        const safeMessage = `[RevenueCat] ${sanitizeRevenueCatLog(message)}`;
        if (level === LOG_LEVEL.ERROR) console.error(safeMessage);
        else if (level === LOG_LEVEL.WARN) console.warn(safeMessage);
        // eslint-disable-next-line no-console
        else if (level === LOG_LEVEL.INFO) console.info(safeMessage);
        // eslint-disable-next-line no-console
        else console.debug(safeMessage);
    });
}

type RevenueCatExtra = {
    release?: { environment?: string };
    revenueCat?: {
        testStoreApiKey?: string;
        iosApiKey?: string;
        androidApiKey?: string;
    };
};

function configuredRevenueCatKeys() {
    const extra = (Constants.expoConfig?.extra ?? {}) as RevenueCatExtra;
    return {
        environment: extra.release?.environment ?? "development",
        testStoreKey: extra.revenueCat?.testStoreApiKey?.trim() ?? "",
        iosKey: extra.revenueCat?.iosApiKey?.trim() ?? "",
        androidKey: extra.revenueCat?.androidApiKey?.trim() ?? "",
    };
}

export function revenueCatPublicApiKey() {
    const { environment, testStoreKey, iosKey, androidKey } = configuredRevenueCatKeys();
    const platformKey = Platform.OS === "ios"
        ? iosKey
        : Platform.OS === "android"
            ? androidKey
            : "";

    if (__DEV__ && environment === "development") return testStoreKey || platformKey;
    // RevenueCat explicitly prohibits shipping Test Store keys. Refuse to
    // configure purchases if a release build is accidentally given one.
    return platformKey.startsWith("test_") ? "" : platformKey;
}

export function isRevenueCatBillingDisabled() {
    const { environment, iosKey, androidKey } = configuredRevenueCatKeys();
    const platformKey = Platform.OS === "ios" ? iosKey : Platform.OS === "android" ? androidKey : "";
    // The first internal TestFlight build deliberately has no Test Store key
    // and may ship before Apple products are connected in RevenueCat. Keep all
    // purchase/restore flows unavailable unless a real platform SDK key exists.
    return environment === "local-release"
        || (environment === "testflight" && (!platformKey || platformKey.startsWith("test_")));
}

export async function configureRevenueCat(userId: string) {
    return withSerializedPurchases(async () => {
        const apiKey = revenueCatPublicApiKey();
        if (!apiKey || !userId) return false;

        installDevelopmentRevenueCatLogHandler();
        const configured = await Purchases.isConfigured();
        if (!configured) {
            Purchases.configure({ apiKey, appUserID: userId });
            if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            return true;
        }

        const activeUserId = await Purchases.getAppUserID();
        if (activeUserId !== userId) await Purchases.logIn(userId);
        return true;
    });
}

export async function clearRevenueCatUser() {
    return withSerializedPurchases(async () => {
        if (!(await Purchases.isConfigured())) return;
        // The native singleton can outlive this JavaScript module after Fast
        // Refresh or a development reload. Its identity is authoritative for
        // deletion cleanup; JavaScript never caches it as an authority.
        if (await Purchases.isAnonymous()) return;
        await Purchases.logOut();
    });
}

export async function loadRevenueCatState(): Promise<{
    customerInfo: CustomerInfo;
    currentOffering: PurchasesOffering | null;
}> {
    return withSerializedPurchases(async () => {
        const [customerInfo, offerings] = await Promise.all([
            Purchases.getCustomerInfo(),
            Purchases.getOfferings(),
        ]);
        return { customerInfo, currentOffering: offerings.current };
    });
}

export async function purchaseRevenueCatPackage(selectedPackage: PurchasesPackage) {
    return withSerializedPurchases(() => Purchases.purchasePackage(selectedPackage));
}

export async function restoreRevenueCatPurchases() {
    return withSerializedPurchases(() => Purchases.restorePurchases());
}

export async function openRevenueCatSubscriptionManagement() {
    return withSerializedPurchases(() => Purchases.showManageSubscriptions());
}

export { Purchases };
