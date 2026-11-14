/* global __dirname, process */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const configPath = path.resolve(__dirname, "..", "app.config.js");
const schemePath = path.resolve(__dirname, "..", "ios", "AutoCareHub.xcodeproj", "xcshareddata", "xcschemes", "AutoCareHub.xcscheme");
const appJsonPath = path.resolve(__dirname, "..", "app.json");
const mapsPluginPath = path.resolve(__dirname, "..", "plugins", "withGoogleMapsIosInitialization.js");
const appDelegatePath = path.resolve(__dirname, "..", "ios", "AutoCareHub", "AppDelegate.swift");
const podfilePath = path.resolve(__dirname, "..", "ios", "Podfile");
const locationPickerPath = path.resolve(__dirname, "..", "src", "components", "LocationPickerField.tsx");
const mapScreenPath = path.resolve(__dirname, "..", "src", "Screens", "MapScreen.tsx");
const androidNightStylesPath = path.resolve(__dirname, "..", "android", "app", "src", "main", "res", "values-night", "styles.xml");

function resolveConfig(environment) {
    const source = `const config = require(process.argv[1])({ config: { android: {}, ios: {}, extra: {} } }); process.stdout.write(JSON.stringify(config.extra));`;
    const result = spawnSync(process.execPath, ["-e", source, configPath], {
        env: { ...process.env, ...environment },
        encoding: "utf8",
    });
    return result;
}

function fail(message) {
    console.error(`Local Release configuration check failed: ${message}`);
    process.exit(1);
}

const scheme = fs.readFileSync(schemePath, "utf8");
if (!/<LaunchAction\s+buildConfiguration = "Debug"/s.test(scheme)) {
    fail("the shared Xcode Run action must use Debug so development-only Google auth is not mapped to local-release.");
}

const localRelease = resolveConfig({
    CONFIGURATION: "Release",
    EXPO_PUBLIC_APP_ENV: "development",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_local_simulator_only",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "",
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "",
});
if (localRelease.status !== 0) fail(localRelease.stderr.trim() || "local simulator Release config did not resolve.");
const localExtra = JSON.parse(localRelease.stdout);
if (localExtra.release?.environment !== "local-release") fail("native Release must resolve to local-release when development is configured.");
if (localExtra.revenueCat?.testStoreApiKey || localExtra.revenueCat?.iosApiKey || localExtra.revenueCat?.androidApiKey) {
    fail("local-release must omit every RevenueCat key.");
}

const explicitLocalRelease = resolveConfig({
    CONFIGURATION: "Debug",
    EXPO_PUBLIC_APP_ENV: "local-release",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_local_simulator_only",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_local_key_must_be_omitted",
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "goog_local_key_must_be_omitted",
});
if (explicitLocalRelease.status !== 0) fail(explicitLocalRelease.stderr.trim() || "explicit local-release config did not resolve.");
const explicitLocalExtra = JSON.parse(explicitLocalRelease.stdout);
if (explicitLocalExtra.revenueCat?.testStoreApiKey || explicitLocalExtra.revenueCat?.iosApiKey || explicitLocalExtra.revenueCat?.androidApiKey) {
    fail("explicit local-release must omit every RevenueCat key.");
}

const development = resolveConfig({
    CONFIGURATION: "Debug",
    EXPO_PUBLIC_APP_ENV: "development",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_development_only",
    EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
    EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
    EXPO_PUBLIC_ENABLE_APPLE_AUTH: "false",
    GOOGLE_MAPS_ANDROID_API_KEY: `AIza${"a".repeat(35)}`,
});
if (development.status !== 0) fail(development.stderr.trim() || "development config did not resolve.");
const developmentExtra = JSON.parse(development.stdout);
if (developmentExtra.release?.environment !== "development" || developmentExtra.revenueCat?.testStoreApiKey !== "test_development_only") {
    fail("development must retain the Test Store key.");
}
if (developmentExtra.socialAuth?.googleEnabled !== true || developmentExtra.socialAuth?.appleEnabled !== false) {
    fail("development must permit Google-only social auth when explicitly requested.");
}
if (!developmentExtra.googleMapsNative?.android) {
    fail("development must configure the Android Google Maps provider when its restricted key is available.");
}
if (developmentExtra.googleMapsNative?.ios || developmentExtra.googleMapsNative?.iosApiKey) {
    fail("iOS must not embed a Google Maps SDK key because it uses MapKit.");
}

const appleSandbox = resolveConfig({
    CONFIGURATION: "Debug",
    EXPO_PUBLIC_APP_ENV: "apple-sandbox",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_apple_sandbox_public_key",
});
if (appleSandbox.status !== 0) fail(appleSandbox.stderr.trim() || "Apple Sandbox config did not resolve.");
const appleSandboxExtra = JSON.parse(appleSandbox.stdout);
if (appleSandboxExtra.release?.environment !== "apple-sandbox"
    || appleSandboxExtra.revenueCat?.testStoreApiKey
    || appleSandboxExtra.revenueCat?.iosApiKey !== "appl_apple_sandbox_public_key") {
    fail("Apple Sandbox must use only the Apple App Store public SDK key.");
}

const leakedTestStoreAppleSandbox = resolveConfig({
    EXPO_PUBLIC_APP_ENV: "apple-sandbox",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_must_be_rejected",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_apple_sandbox_public_key",
});
if (leakedTestStoreAppleSandbox.status === 0 || !leakedTestStoreAppleSandbox.stderr.includes("must be empty")) {
    fail("Apple Sandbox must reject a Test Store key.");
}

const previewSocialAuth = resolveConfig({
    EXPO_PUBLIC_APP_ENV: "preview",
    EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
    EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
    EXPO_PUBLIC_ENABLE_APPLE_AUTH: "true",
});
if (previewSocialAuth.status !== 0) fail(previewSocialAuth.stderr.trim() || "preview social-auth config did not resolve.");
const previewExtra = JSON.parse(previewSocialAuth.stdout);
if (previewExtra.socialAuth?.enabled || previewExtra.socialAuth?.googleEnabled || previewExtra.socialAuth?.appleEnabled) {
    fail("preview must force all social providers off.");
}

const testflight = resolveConfig({
    EAS_BUILD_PLATFORM: "ios",
    EXPO_PUBLIC_APP_ENV: "testflight",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "",
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "",
    EXPO_PUBLIC_ENABLE_SOCIAL_AUTH: "true",
    EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: "true",
    EXPO_PUBLIC_ENABLE_APPLE_AUTH: "true",
});
if (testflight.status !== 0) fail(testflight.stderr.trim() || "TestFlight config did not resolve.");
const testflightExtra = JSON.parse(testflight.stdout);
if (testflightExtra.release?.environment !== "testflight") {
    fail("TestFlight must resolve to its own runtime environment.");
}
if (testflightExtra.revenueCat?.testStoreApiKey || testflightExtra.revenueCat?.iosApiKey || testflightExtra.revenueCat?.androidApiKey) {
    fail("TestFlight without a real store key must omit every RevenueCat key.");
}
if (!testflightExtra.socialAuth?.googleEnabled || !testflightExtra.socialAuth?.appleEnabled) {
    fail("TestFlight must allow explicitly configured Apple and Google authentication.");
}

const testflightValidation = spawnSync(process.execPath, [path.resolve(__dirname, "validate-release-config.cjs")], {
    env: {
        ...process.env,
        EAS_BUILD_PLATFORM: "ios",
        EXPO_PUBLIC_APP_ENV: "testflight",
        EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "",
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "",
    },
    encoding: "utf8",
});
if (testflightValidation.status !== 0) {
    fail(testflightValidation.stderr.trim() || "TestFlight release validation failed.");
}

for (const distributionEnvironment of ["testflight", "preview", "production"]) {
    const leakedTestStoreConfig = resolveConfig({
        EXPO_PUBLIC_APP_ENV: distributionEnvironment,
        EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_must_be_rejected",
    });
    if (leakedTestStoreConfig.status === 0 || !leakedTestStoreConfig.stderr.includes("must be empty")) {
        fail(`${distributionEnvironment} must reject a Test Store key injected by the build environment.`);
    }

    const leakedTestStorePreinstall = spawnSync(process.execPath, [path.resolve(__dirname, "validate-release-config.cjs")], {
        env: {
            ...process.env,
            EXPO_PUBLIC_APP_ENV: distributionEnvironment,
            EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_must_be_rejected",
        },
        encoding: "utf8",
    });
    if (leakedTestStorePreinstall.status === 0 || !leakedTestStorePreinstall.stderr.includes("must be empty")) {
        fail(`${distributionEnvironment} EAS pre-install validation must reject a Test Store key.`);
    }
}

const invalidProduction = resolveConfig({
    EXPO_PUBLIC_APP_ENV: "production",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_must_be_rejected",
});
if (invalidProduction.status === 0 || !invalidProduction.stderr.includes("must be empty")) {
    fail("production must reject a Test Store key.");
}

const appPlugins = JSON.parse(fs.readFileSync(appJsonPath, "utf8")).expo.plugins;
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8")).expo;
if (appJson.userInterfaceStyle !== "automatic" || appJson.ios?.userInterfaceStyle !== "automatic") {
    fail("Expo and iOS must permit system, light, and dark appearance.");
}
const androidNightStyles = fs.readFileSync(androidNightStylesPath, "utf8");
if (!androidNightStyles.includes('name="android:statusBarColor"') || !androidNightStyles.includes("#0D1424")) {
    fail("Android dark mode must provide a dark native status-bar background.");
}
if (appPlugins.includes("./plugins/withGoogleMapsIosInitialization")) {
    fail("the obsolete Google Maps iOS initialization plugin must stay disabled.");
}
if (fs.existsSync(mapsPluginPath)) {
    fail("the obsolete Google Maps iOS initialization plugin must not be restored.");
}
const appDelegate = fs.readFileSync(appDelegatePath, "utf8");
if (/GoogleMaps|GMSServices|AutoCareGoogleMaps/.test(appDelegate)) {
    fail("AppDelegate must not initialize the Google Maps SDK on iOS.");
}
const podfile = fs.readFileSync(podfilePath, "utf8");
if (/react-native-google-maps/.test(podfile)) {
    fail("the iOS Podfile must not link the Google Maps provider.");
}
for (const sourcePath of [locationPickerPath, mapScreenPath]) {
    const source = fs.readFileSync(sourcePath, "utf8");
    if (/Platform\.OS\s*===\s*["']ios["']\s*\?\s*PROVIDER_GOOGLE/.test(source)) {
        fail(`${path.basename(sourcePath)} must use MapKit rather than PROVIDER_GOOGLE on iOS.`);
    }
}

console.log("Development, TestFlight, local simulator Release, production billing, Android Google Maps, and iOS MapKit are safely configured.");
