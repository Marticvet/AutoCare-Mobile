const { createRunOncePlugin, withAppDelegate } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const withGoogleMapsIosInitialization = (config) => withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
        throw new Error("AutoCare Google Maps initialization requires a Swift AppDelegate.");
    }

    config.modResults.contents = mergeContents({
        tag: "autocare-google-maps-import",
        src: config.modResults.contents,
        newSrc: ["#if canImport(GoogleMaps)", "import GoogleMaps", "#endif"].join("\n"),
        anchor: /@UIApplicationMain/,
        offset: 0,
        comment: "//",
    }).contents;
    config.modResults.contents = mergeContents({
        tag: "autocare-google-maps-initialize",
        src: config.modResults.contents,
        newSrc: ["#if canImport(GoogleMaps)", "    AutoCareGoogleMaps.initialize()", "#endif"].join("\n"),
        anchor: /let delegate = ReactNativeDelegate\(\)/,
        offset: 0,
        comment: "//",
    }).contents;
    config.modResults.contents = mergeContents({
        tag: "autocare-google-maps-config",
        src: config.modResults.contents,
        newSrc: [
            "private enum AutoCareGoogleMaps {",
            "  static func initialize() {",
            "    guard let apiKey = apiKey() else { return }",
            "    GMSServices.provideAPIKey(apiKey)",
            "  }",
            "",
            "  private static func apiKey() -> String? {",
            "    if let configured = Bundle.main.object(forInfoDictionaryKey: \"GMSApiKey\") as? String,",
            "       configured.hasPrefix(\"AIza\") {",
            "      return configured",
            "    }",
            "",
            "    guard let bundleURL = Bundle.main.url(forResource: \"EXConstants\", withExtension: \"bundle\"),",
            "          let constantsBundle = Bundle(url: bundleURL),",
            "          let configURL = constantsBundle.url(forResource: \"app\", withExtension: \"config\"),",
            "          let data = try? Data(contentsOf: configURL),",
            "          let object = try? JSONSerialization.jsonObject(with: data),",
            "          let appConfig = object as? [String: Any],",
            "          let extra = appConfig[\"extra\"] as? [String: Any],",
            "          let mapsConfig = extra[\"googleMapsNative\"] as? [String: Any],",
            "          let apiKey = mapsConfig[\"iosApiKey\"] as? String,",
            "          apiKey.hasPrefix(\"AIza\") else {",
            "      return nil",
            "    }",
            "    return apiKey",
            "  }",
            "}",
        ].join("\n"),
        anchor: /class ReactNativeDelegate:/,
        offset: 0,
        comment: "//",
    }).contents;
    return config;
});

module.exports = createRunOncePlugin(
    withGoogleMapsIosInitialization,
    "autocare-google-maps-ios-initialization",
    "1.0.0",
);
