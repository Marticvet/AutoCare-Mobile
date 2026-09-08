module.exports = ({ config }) => {
    const googleApiKey = (...names) => names
        .map((name) => process.env[name]?.trim())
        .find((value) => /^AIza[0-9A-Za-z_-]{30,}$/.test(value || "")) || "";
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

    return {
        ...config,
        android: {
            ...config.android,
            config: {
                ...config.android?.config,
                googleMaps: {
                    ...config.android?.config?.googleMaps,
                    apiKey: androidGoogleMapsApiKey,
                },
            },
        },
        ios: {
            ...config.ios,
            config: {
                ...config.ios?.config,
                googleMapsApiKey: iosGoogleMapsApiKey,
            },
        },
        extra: {
            ...config.extra,
            googleMapsNative: {
                android: Boolean(androidGoogleMapsApiKey),
                ios: Boolean(iosGoogleMapsApiKey),
                // Native Maps SDK keys are embedded in app binaries by design. Keep this
                // platform-restricted in Google Cloud; never put the server Places key here.
                iosApiKey: iosGoogleMapsApiKey,
            },
        },
    };
};
