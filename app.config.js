module.exports = ({ config }) => {
    const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim();
    // Xcode exposes CONFIGURATION to Expo's bundle phase. A local simulator
    // Release is useful for smoke tests but is not a distribution artifact;
    // keep it distinct from EAS preview/production even when Expo loads a
    // developer's Test Store key from .env.
    const isNativeRelease = process.env.CONFIGURATION === "Release";
    const isLocalReleaseSimulator =
        isNativeRelease &&
        (!configuredEnvironment || configuredEnvironment === "development");
    const appEnvironment = isLocalReleaseSimulator
        ? "local-release"
        : configuredEnvironment || "development";
    const isLocalReleaseEnvironment = appEnvironment === "local-release";
    // Apple Sandbox uses the real App Store SDK key against Apple's sandbox
    // catalog. It is intentionally separate from TestFlight distribution and
    // from the RevenueCat Test Store development channel.
    const isAppleSandboxEnvironment = appEnvironment === "apple-sandbox";
    const isDistributionEnvironment =
        appEnvironment === "testflight" ||
        appEnvironment === "preview" ||
        appEnvironment === "production";
    const usesStoreBilling =
        isAppleSandboxEnvironment || isDistributionEnvironment;
    const revenueCatTestApiKey =
        process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim() ?? "";
    if (usesStoreBilling && revenueCatTestApiKey) {
        throw new Error(
            "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY must be empty for Apple Sandbox, TestFlight, preview, and production builds."
        );
    }
    const revenueCatIosApiKey =
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? "";
    const revenueCatAndroidApiKey =
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
    if (isAppleSandboxEnvironment && !revenueCatIosApiKey.startsWith("appl_")) {
        throw new Error(
            "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY must be the Apple App Store appl_ public SDK key for apple-sandbox builds."
        );
    }
    if (
        isDistributionEnvironment &&
        (revenueCatIosApiKey.startsWith("test_") ||
            revenueCatAndroidApiKey.startsWith("test_"))
    ) {
        throw new Error(
            "RevenueCat Test Store API keys must not be used for TestFlight, preview, or production builds."
        );
    }
    const googleApiKey = (...names) =>
        names
            .map((name) => process.env[name]?.trim())
            .find((value) => /^AIza[0-9A-Za-z_-]{30,}$/.test(value || "")) ||
        "";
    const androidGoogleMapsApiKey = googleApiKey(
        "GOOGLE_MAPS_ANDROID_API_KEY",
        "EXPO_GOOGLE_API_KEY",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
    );
    const iosGoogleMapsApiKey = googleApiKey(
        "GOOGLE_MAPS_IOS_API_KEY",
        "EXPO_GOOGLE_API_KEY",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
    );
    // The Google Maps SDK needs its platform-restricted key in every native
    // binary that renders PROVIDER_GOOGLE, including Debug development builds.
    // The iOS config plugin reads this from Expo's generated config at runtime;
    // it never writes a key literal into tracked Swift or plist files.
    const includeNativeMapsKey =
        Boolean(process.env.EAS_BUILD_PLATFORM) ||
        appEnvironment === "development" ||
        isAppleSandboxEnvironment ||
        isLocalReleaseEnvironment ||
        process.env.INCLUDE_NATIVE_MAPS_KEY === "true";
    // Provider credentials and release approval are independent. Social auth is
    // deliberately limited to local/development builds until each provider has
    // completed physical-device acceptance.
    const socialAuthRequested =
        process.env.EXPO_PUBLIC_ENABLE_SOCIAL_AUTH === "true";
    // Internal TestFlight is an explicit, separately named release channel.
    // Preview and production stay off until their own launch approval.
    const socialAuthAllowed =
        appEnvironment === "development" || appEnvironment === "testflight";
    const googleAuthEnabled =
        socialAuthAllowed &&
        socialAuthRequested &&
        process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
    const appleAuthEnabled =
        socialAuthAllowed &&
        socialAuthRequested &&
        process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === "true";

    return {
        ...config,
        android: {
            ...config.android,
            config: {
                ...config.android?.config,
                ...(includeNativeMapsKey && androidGoogleMapsApiKey
                    ? {
                          googleMaps: {
                              ...config.android?.config?.googleMaps,
                              apiKey: androidGoogleMapsApiKey,
                          },
                      }
                    : {}),
            },
        },
        ios: {
            ...config.ios,
            config: {
                ...config.ios?.config,
                usesNonExemptEncryption: false,
            },
        },
        extra: {
            ...config.extra,
            release: {
                environment: appEnvironment,
            },
            revenueCat: {
                // Keep all public billing configuration in Expo config. The
                // Test Store key is development-only. Local simulator Release
                // builds deliberately have no billing key and cannot unlock
                // premium access when real store keys are unavailable.
                testStoreApiKey:
                    appEnvironment === "development"
                        ? revenueCatTestApiKey
                        : "",
                iosApiKey: isLocalReleaseEnvironment ? "" : revenueCatIosApiKey,
                androidApiKey: isLocalReleaseEnvironment
                    ? ""
                    : revenueCatAndroidApiKey,
            },
            googleMapsNative: {
                android: Boolean(
                    includeNativeMapsKey && androidGoogleMapsApiKey
                ),
                ios: Boolean(includeNativeMapsKey && iosGoogleMapsApiKey),
                // Native Maps SDK keys are embedded in app binaries by design. Keep this
                // platform-restricted in Google Cloud; never put the server Places key here.
                iosApiKey: includeNativeMapsKey ? iosGoogleMapsApiKey : "",
            },
            // These controls contain no provider credentials. Preview and
            // production remain off even if a public flag is accidentally set.
            socialAuth: {
                enabled: googleAuthEnabled || appleAuthEnabled,
                googleEnabled: googleAuthEnabled,
                appleEnabled: appleAuthEnabled,
            },
        },
    };
};
