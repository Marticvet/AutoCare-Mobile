/*
 * Runs in EAS before dependency installation. It deliberately uses only Node
 * built-ins: a production artifact must fail before a Test Store key can be
 * bundled or RevenueCat has a chance to reject it at app launch.
 */
const environment = (process.env.EXPO_PUBLIC_APP_ENV || "development").trim();
const platform = (process.env.EAS_BUILD_PLATFORM || process.argv[2] || "").trim();
const testStoreKey = (process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || "").trim();

const fail = (message) => {
    console.error(`Release configuration error: ${message}`);
    process.exitCode = 1;
};

const isReleaseEnvironment = environment === "testflight" || environment === "preview" || environment === "production";
const requiresStoreBillingKey = environment === "preview" || environment === "production";
if (!new Set(["development", "local-release", "testflight", "preview", "production"]).has(environment)) {
    fail("EXPO_PUBLIC_APP_ENV must be development, local-release, testflight, preview, or production.");
}

if (isReleaseEnvironment && testStoreKey) {
    fail("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY must be empty for TestFlight, preview, and production builds.");
}

if (requiresStoreBillingKey && platform) {
    const name = platform === "ios"
        ? "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"
        : platform === "android"
            ? "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"
            : "";
    const key = name ? (process.env[name] || "").trim() : "";
    const expectedPrefix = platform === "ios" ? "appl_" : "goog_";

    if (!name) fail(`Unsupported EAS_BUILD_PLATFORM: ${platform}.`);
    else if (!key) fail(`${name} is required for a ${environment} ${platform} artifact.`);
    else if (key.startsWith("test_")) fail(`${name} must be the platform public SDK key, never a Test Store key.`);
    else if (!key.startsWith(expectedPrefix)) fail(`${name} must start with ${expectedPrefix}.`);
}

if (!process.exitCode) {
    console.log(`RevenueCat build configuration is safe for ${environment}${platform ? `/${platform}` : ""}.`);
}
