const { createRunOncePlugin, withAndroidManifest } = require("expo/config-plugins");

const packageMetadata = {
    name: "autocare-with-android-maps-key-placeholder",
    version: "1.0.0",
};

/**
 * The Android Maps SDK needs a manifest entry, while the actual restricted
 * key is supplied by Gradle at build time. Keeping the placeholder in the
 * generated manifest prevents a developer's local .env value from becoming a
 * tracked native-source literal during prebuild.
 */
function withAndroidMapsKeyPlaceholder(config) {
    return withAndroidManifest(config, (modifiedConfig) => {
        const application = modifiedConfig.modResults.manifest.application?.[0];
        if (!application) {
            throw new Error("Android manifest does not contain an application element.");
        }

        application["meta-data"] ??= [];
        const keyName = "com.google.android.geo.API_KEY";
        const existing = application["meta-data"].find(
            (entry) => entry.$?.["android:name"] === keyName
        );
        if (existing) {
            existing.$["android:value"] = "${GOOGLE_MAPS_API_KEY}";
        } else {
            application["meta-data"].push({
                $: {
                    "android:name": keyName,
                    "android:value": "${GOOGLE_MAPS_API_KEY}",
                },
            });
        }
        return modifiedConfig;
    });
}

module.exports = createRunOncePlugin(
    withAndroidMapsKeyPlaceholder,
    packageMetadata.name,
    packageMetadata.version,
);
