module.exports = ({ config }) => {
    const googleMapsApiKey =
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
        process.env.EXPO_GOOGLE_API_KEY ||
        "";

    return {
        ...config,
        extra: {
            ...config.extra,
            // Mobile Maps keys are client-visible by design. Restrict this key
            // by bundle/package and API in Google Cloud.
            googleMapsApiKey,
        },
    };
};
