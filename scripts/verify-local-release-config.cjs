/* global __dirname, process */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const configPath = path.resolve(__dirname, "..", "app.config.js");
const schemePath = path.resolve(__dirname, "..", "ios", "AutoCareHub.xcodeproj", "xcshareddata", "xcschemes", "AutoCareHub.xcscheme");
const appJsonPath = path.resolve(__dirname, "..", "app.json");
const mapsPluginPath = path.resolve(__dirname, "..", "plugins", "withGoogleMapsIosInitialization.js");
const appDelegatePath = path.resolve(__dirname, "..", "ios", "AutoCareHub", "AppDelegate.swift");

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
    GOOGLE_MAPS_IOS_API_KEY: `AIza${"a".repeat(35)}`,
});
if (development.status !== 0) fail(development.stderr.trim() || "development config did not resolve.");
const developmentExtra = JSON.parse(development.stdout);
if (developmentExtra.release?.environment !== "development" || developmentExtra.revenueCat?.testStoreApiKey !== "test_development_only") {
    fail("development must retain the Test Store key.");
}
if (developmentExtra.socialAuth?.googleEnabled !== true || developmentExtra.socialAuth?.appleEnabled !== false) {
    fail("development must permit Google-only social auth when explicitly requested.");
}
if (!developmentExtra.googleMapsNative?.ios || !developmentExtra.googleMapsNative?.iosApiKey?.startsWith("AIza")) {
    fail("development must embed the iOS Google Maps key in Expo config for the native initializer.");
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

const invalidProduction = resolveConfig({
    EXPO_PUBLIC_APP_ENV: "production",
    EXPO_PUBLIC_REVENUECAT_TEST_API_KEY: "test_must_be_rejected",
});
if (invalidProduction.status === 0 || !invalidProduction.stderr.includes("must be empty")) {
    fail("production must reject a Test Store key.");
}

const appPlugins = JSON.parse(fs.readFileSync(appJsonPath, "utf8")).expo.plugins;
if (!appPlugins.includes("./plugins/withGoogleMapsIosInitialization")) {
    fail("the Google Maps iOS initialization config plugin must remain enabled.");
}
const mapsPlugin = fs.readFileSync(mapsPluginPath, "utf8");
if ((mapsPlugin.match(/GMSServices\.provideAPIKey\(apiKey\)/g) || []).length !== 1) {
    fail("the iOS Google Maps config plugin must initialize GMSServices exactly once.");
}
const appDelegate = fs.readFileSync(appDelegatePath, "utf8");
if ((appDelegate.match(/GMSServices\.provideAPIKey\(apiKey\)/g) || []).length !== 1) {
    fail("AppDelegate must contain exactly one generated Google Maps initialization call.");
}
const mapsInitializerIndex = appDelegate.indexOf("AutoCareGoogleMaps.initialize()");
const reactNativeFactoryIndex = appDelegate.indexOf("let delegate = ReactNativeDelegate()");
if (mapsInitializerIndex === -1 || reactNativeFactoryIndex === -1 || mapsInitializerIndex > reactNativeFactoryIndex) {
    fail("Google Maps must initialize before React Native can mount MapView.");
}
if (/GMSServices\.provideAPIKey\(\s*\"AIza/.test(appDelegate)) {
    fail("AppDelegate must not contain a literal Google Maps API key.");
}

console.log("Development, TestFlight, local simulator Release, production billing, and iOS Google Maps initialization are safely configured.");
