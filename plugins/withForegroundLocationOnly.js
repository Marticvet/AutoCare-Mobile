const { createRunOncePlugin, withInfoPlist } = require("expo/config-plugins");

const packageMetadata = {
    name: "autocare-with-foreground-location-only",
    version: "1.0.0",
};

/**
 * AutoCare only calls Expo Location foreground APIs. Keep generated iOS
 * configuration aligned with that behaviour, so an old prebuild cannot leave
 * background/always location purpose strings in a submission binary.
 */
function withForegroundLocationOnly(config) {
    return withInfoPlist(config, (modifiedConfig) => {
        delete modifiedConfig.modResults.NSLocationAlwaysUsageDescription;
        delete modifiedConfig.modResults.NSLocationAlwaysAndWhenInUseUsageDescription;
        if (Array.isArray(modifiedConfig.modResults.UIBackgroundModes)) {
            modifiedConfig.modResults.UIBackgroundModes = modifiedConfig.modResults.UIBackgroundModes
                .filter((mode) => mode !== "location");
        }
        return modifiedConfig;
    });
}

module.exports = createRunOncePlugin(
    withForegroundLocationOnly,
    packageMetadata.name,
    packageMetadata.version,
);
