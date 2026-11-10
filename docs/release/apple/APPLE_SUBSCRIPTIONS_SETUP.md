# Real Apple subscriptions

Existing products: autocare_plus_monthly, autocare_plus_yearly, autocare_family_monthly, autocare_family_yearly. Existing entitlements: plus_features (Plus and Family), shared_garage (Family). Family allows six people total including owner.

1. Confirm Apple membership, App Store Connect app com.marticvet.autocare and paid-app agreements/tax/banking. Distribution signing was owner-confirmed; no new Apple access was attempted.
2. Create/verify the four auto-renewable subscription products and an approved subscription-group/upgrade structure. Set localized name, duration, prices, availability and review screenshots. No price/trial is assumed.
3. Connect the Apple app to RevenueCat with approved server credentials; map products to the two entitlements and existing offering packages. Verify sandbox and production webhook filtering deliberately; current Test Store webhook acceptance does not establish Apple configuration.
4. Set the real appl_ public iOS SDK key in the approved EAS environment. Never set Test Store or server credentials there. Production pre-install requires the platform key; TestFlight may disable billing when it is absent.
5. Test all four products, interruption/cancellation, restore after restart, expiry/refund/renewal, login switch, and server mirror/Family access. Verify receipt environment and signed-user UUID without exposing identifiers in logs.
6. Submit subscriptions together with the first binary when required by App Store Connect. No products, credentials, webhooks or billing settings were changed here.

See ../REVENUECAT_SETUP.md and ../REVENUECAT_DELETION_SCHEDULER.md for existing security/operations evidence and unresolved automatic retry monitoring.
