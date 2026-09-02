require("dotenv/config");

const base = require("./app.json").expo;
const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_GOOGLE_API_KEY ||
    "";

module.exports = {
    expo: {
        ...base,
        ios: {
            ...base.ios,
            config: {
                ...base.ios?.config,
                googleMapsApiKey,
            },
        },
        android: {
            ...base.android,
            config: {
                ...base.android?.config,
                googleMaps: {
                    ...base.android?.config?.googleMaps,
                    apiKey: googleMapsApiKey,
                },
            },
        },
        extra: {
            ...base.extra,
            // Mobile Maps keys are client-visible by design. Restrict this key
            // by bundle/package and API in Google Cloud.
            googleMapsApiKey,
        },
    },
};
