# Apple Developer and App Store Connect setup

Complete in this order after Apple Developer Program membership is active.

1. Register/sign in with the organization or individual Apple Developer team; verify legal entity, tax, banking, and agreements as applicable.
2. Register App ID `com.marticvet.autocare`; enable only capabilities actually used. The current release needs no remote-push entitlement because reminders are local. Do not enable APNs until remote push is a planned feature.
3. Create the App Store Connect app with the same bundle ID, product name, primary category, SKU, and privacy contact.
4. Create auto-renewable subscriptions using the established product identifiers from `REVENUECAT_SETUP.md`; set pricing, duration, localization, availability, review screenshot, and required subscription information. These are business decisions, not code defaults.
5. Connect the iOS app in RevenueCat, import/map products to `plus_features` and `shared_garage`, then set the `appl_…` public SDK key in the EAS preview and production environments.
6. Create managed signing credentials in EAS or provide your own Apple distribution certificate/provisioning profile. Keep private keys out of the repository.
7. Build with EAS production; the profile requires the production key and has `credentialsSource: remote`. Increase the remote build number for every upload.
8. Test on StoreKit sandbox/TestFlight: sign-in, purchase each product, cancel, restore, expiration, billing issue, refund, webhook update, family access, and a second device.
9. Fill in App Store metadata, privacy, age rating, accessibility, trader, export-compliance, and reviewer notes from `docs/release/store/`. Use approved URLs and real screenshots.
10. Upload, select the build, provide a non-expiring reviewer account or review instructions through App Store Connect only, and submit.

Apple currently requires App Store Connect uploads built with Xcode 26+ and an iOS 26 SDK: <https://developer.apple.com/news/upcoming-requirements/?id=04282026a>. Xcode 26 requires a compatible macOS release; confirm the final EAS image/toolchain at build time. Apple’s current App Review Guidelines remain the governing policy: <https://developer.apple.com/app-store/review/guidelines/>.
