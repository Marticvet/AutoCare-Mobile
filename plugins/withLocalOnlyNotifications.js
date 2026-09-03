const {
    createRunOncePlugin,
    withEntitlementsPlist,
} = require("expo/config-plugins");

const packageMetadata = {
    name: "autocare-with-local-only-notifications",
    version: "1.0.0",
};

/**
 * expo-notifications enables the APNs entitlement by default. AutoCare Hub
 * currently schedules reminders on-device, so APNs is unnecessary and blocks
 * signing with a free Apple Personal Team. Keep this plugin before
 * expo-notifications in app.json so its entitlement mod runs after Expo's.
 *
 * Remove this plugin when remote push notifications are introduced and the app
 * is signed by a paid Apple Developer Program team.
 */
function withLocalOnlyNotifications(config) {
    return withEntitlementsPlist(config, (modifiedConfig) => {
        delete modifiedConfig.modResults["aps-environment"];
        return modifiedConfig;
    });
}

module.exports = createRunOncePlugin(
    withLocalOnlyNotifications,
    packageMetadata.name,
    packageMetadata.version,
);
