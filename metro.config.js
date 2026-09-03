const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;
const reactNativeKyselyEntry = path.resolve(
    __dirname,
    "src/powersync/kysely.native.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "kysely" && platform !== "web") {
        return context.resolveRequest(context, reactNativeKyselyEntry, platform);
    }

    if (defaultResolveRequest) {
        return defaultResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
