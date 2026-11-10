jest.mock("expo-constants", () => ({
    __esModule: true,
    default: {
        expoConfig: {
            extra: {
                release: { environment: "production" },
                revenueCat: { iosApiKey: "appl_test_key", androidApiKey: "goog_test_key" },
            },
        },
    },
}));

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

jest.mock("react-native-purchases", () => ({
    __esModule: true,
    LOG_LEVEL: { DEBUG: "DEBUG", INFO: "INFO", WARN: "WARN", ERROR: "ERROR" },
    default: {
        isConfigured: jest.fn(),
        configure: jest.fn(),
        setLogLevel: jest.fn(),
        getAppUserID: jest.fn(),
        isAnonymous: jest.fn(),
        logIn: jest.fn(),
        logOut: jest.fn(),
        setLogHandler: jest.fn(),
        getCustomerInfo: jest.fn(),
        getOfferings: jest.fn(),
    },
}));

// Mocks must be registered before loading the native SDK wrapper.
// eslint-disable-next-line import/first
import Constants from "expo-constants";
// eslint-disable-next-line import/first
import {
    clearRevenueCatUser,
    configureRevenueCat,
    loadRevenueCatState,
    Purchases,
    isRevenueCatBillingDisabled,
    revenueCatPublicApiKey,
    sanitizeRevenueCatLog,
} from "../revenueCat";

const mockedPurchases = Purchases as unknown as {
    isConfigured: jest.Mock;
    configure: jest.Mock;
    getAppUserID: jest.Mock;
    isAnonymous: jest.Mock;
    logIn: jest.Mock;
    logOut: jest.Mock;
    getCustomerInfo: jest.Mock;
    getOfferings: jest.Mock;
};

const setExpoExtra = (extra: Record<string, unknown>) => {
    (Constants as unknown as { expoConfig: { extra: Record<string, unknown> } }).expoConfig = { extra };
};

describe("RevenueCat configuration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setExpoExtra({
            release: { environment: "production" },
            revenueCat: { iosApiKey: "appl_test_key", androidApiKey: "goog_test_key" },
        });
        mockedPurchases.isConfigured.mockResolvedValue(true);
        mockedPurchases.getAppUserID.mockResolvedValue("anonymous");
        mockedPurchases.isAnonymous.mockResolvedValue(false);
        mockedPurchases.logIn.mockResolvedValue({});
        mockedPurchases.logOut.mockResolvedValue({});
        mockedPurchases.getCustomerInfo.mockResolvedValue({});
        mockedPurchases.getOfferings.mockResolvedValue({ current: null });
    });

    it("uses the production platform key rather than a Test Store key", () => {
        expect(revenueCatPublicApiKey()).toBe("appl_test_key");
        expect(isRevenueCatBillingDisabled()).toBe(false);
    });

    it("disables purchases in TestFlight until a real iOS SDK key is configured", () => {
        setExpoExtra({
            release: { environment: "testflight" },
            revenueCat: { iosApiKey: "", androidApiKey: "" },
        });

        expect(revenueCatPublicApiKey()).toBe("");
        expect(isRevenueCatBillingDisabled()).toBe(true);
    });

    it("does not use a leaked Test Store key in a TestFlight runtime config", async () => {
        setExpoExtra({
            release: { environment: "testflight" },
            revenueCat: { testStoreApiKey: "test_leaked_key", iosApiKey: "", androidApiKey: "" },
        });

        expect(revenueCatPublicApiKey()).toBe("");
        expect(isRevenueCatBillingDisabled()).toBe(true);
        await expect(configureRevenueCat("test-user")).resolves.toBe(false);
        expect(mockedPurchases.configure).not.toHaveBeenCalled();
    });

    it("permits TestFlight billing only with a real iOS public SDK key", () => {
        setExpoExtra({
            release: { environment: "testflight" },
            revenueCat: { iosApiKey: "appl_testflight_public_key", androidApiKey: "" },
        });

        expect(revenueCatPublicApiKey()).toBe("appl_testflight_public_key");
        expect(isRevenueCatBillingDisabled()).toBe(false);
    });

    it("uses the Apple App Store public SDK key for the explicit Apple Sandbox channel", () => {
        setExpoExtra({
            release: { environment: "apple-sandbox" },
            revenueCat: { testStoreApiKey: "", iosApiKey: "appl_apple_sandbox_public_key", androidApiKey: "" },
        });

        expect(revenueCatPublicApiKey()).toBe("appl_apple_sandbox_public_key");
        expect(isRevenueCatBillingDisabled()).toBe(false);
    });

    it("does not let a delayed sign-out clear a subsequent sign-in", async () => {
        await configureRevenueCat("first-user");
        mockedPurchases.logIn.mockClear();

        let releaseLogout: (() => void) | undefined;
        mockedPurchases.logOut.mockImplementationOnce(() => new Promise<void>((resolve) => {
            releaseLogout = resolve;
        }));

        const signOut = clearRevenueCatUser();
        const signIn = configureRevenueCat("second-user");

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mockedPurchases.logOut).toHaveBeenCalledTimes(1);
        expect(mockedPurchases.logIn).not.toHaveBeenCalled();

        releaseLogout?.();
        await Promise.all([signOut, signIn]);
        expect(mockedPurchases.logIn).toHaveBeenCalledWith("second-user");
    });

    it("finishes outstanding SDK work before deletion cleanup, then supports a new user after restart", async () => {
        await configureRevenueCat("deleted-user");
        mockedPurchases.logOut.mockClear();
        mockedPurchases.logIn.mockClear();

        let finishCustomerInfo: (() => void) | undefined;
        mockedPurchases.getCustomerInfo.mockImplementationOnce(() => new Promise((resolve) => {
            finishCustomerInfo = () => resolve({});
        }));

        const outstandingState = loadRevenueCatState();
        const cleanup = clearRevenueCatUser();

        await Promise.resolve();
        await Promise.resolve();
        expect(mockedPurchases.logOut).not.toHaveBeenCalled();

        finishCustomerInfo?.();
        await Promise.all([outstandingState, cleanup]);
        expect(mockedPurchases.logOut).toHaveBeenCalledTimes(1);

        // A relaunch begins from the anonymous identity created by logOut.
        mockedPurchases.getAppUserID.mockResolvedValue("anonymous");
        await configureRevenueCat("different-user");
        expect(mockedPurchases.logIn).toHaveBeenCalledWith("different-user");
    });

    it("clears a persisted native custom identity even when the JavaScript cache was reset", async () => {
        await configureRevenueCat("deleted-user");
        await clearRevenueCatUser();
        mockedPurchases.logOut.mockClear();

        // Simulates a JavaScript reload while the native singleton still has a
        // custom identity. Cleanup must follow the native state, not JS state.
        mockedPurchases.isAnonymous.mockResolvedValue(false);
        await clearRevenueCatUser();

        expect(mockedPurchases.logOut).toHaveBeenCalledTimes(1);
    });

    it("redacts customer identifiers and credentials from development SDK diagnostics", () => {
        expect(sanitizeRevenueCatLog(
            "App User ID: 48eb10e5-9c44-4545-88a0-9c492c86b6f5 $RCAnonymousID:abc123 email=a@example.com&token=secret"
        )).toBe("App User ID: [redacted] $RCAnonymousID:[redacted] email=[redacted]&token=[redacted]");
    });
});
