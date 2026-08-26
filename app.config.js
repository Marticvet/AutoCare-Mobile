require("dotenv/config");

const base = require("./app.json").expo;

module.exports = {
    expo: {
        ...base,
        extra: {
            ...base.extra,
            // Mobile Maps keys are client-visible by design. Restrict this key
            // by bundle/package and API in Google Cloud.
            googleMapsApiKey:
                process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
                process.env.EXPO_GOOGLE_API_KEY ||
                "",
        },
    },
};

