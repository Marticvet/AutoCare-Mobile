import Expo
import React
import ReactAppDependencyProvider
// @generated begin autocare-google-maps-import - expo prebuild (DO NOT MODIFY) sync-ead8e4c4584170af6926ce7809157fb1c40b76f1
#if canImport(GoogleMaps)
import GoogleMaps
#endif
// @generated end autocare-google-maps-import

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
// @generated begin autocare-google-maps-initialize - expo prebuild (DO NOT MODIFY) sync-ead8e4c4584170af6926ce7809157fb1c40b76f1
#if canImport(GoogleMaps)
    AutoCareGoogleMaps.initialize()
#endif
// @generated end autocare-google-maps-initialize
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

// @generated begin autocare-google-maps-config - expo prebuild (DO NOT MODIFY) sync-ead8e4c4584170af6926ce7809157fb1c40b76f1
private enum AutoCareGoogleMaps {
  static func initialize() {
    guard let apiKey = apiKey() else { return }
    GMSServices.provideAPIKey(apiKey)
  }

  private static func apiKey() -> String? {
    if let configured = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String,
       configured.hasPrefix("AIza") {
      return configured
    }

    guard let bundleURL = Bundle.main.url(forResource: "EXConstants", withExtension: "bundle"),
          let constantsBundle = Bundle(url: bundleURL),
          let configURL = constantsBundle.url(forResource: "app", withExtension: "config"),
          let data = try? Data(contentsOf: configURL),
          let object = try? JSONSerialization.jsonObject(with: data),
          let appConfig = object as? [String: Any],
          let extra = appConfig["extra"] as? [String: Any],
          let mapsConfig = extra["googleMapsNative"] as? [String: Any],
          let apiKey = mapsConfig["iosApiKey"] as? String,
          apiKey.hasPrefix("AIza") else {
      return nil
    }
    return apiKey
  }
}
// @generated end autocare-google-maps-config

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
