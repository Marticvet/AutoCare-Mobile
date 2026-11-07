# Google Play setup

1. Create/verify the Google Play Console developer account and payments profile; complete organization, tax, and contact details.
2. Create app package `com.marticvet.autocare`; retain the existing package name permanently after its first upload.
3. Prepare the Data safety form from the verified worksheet. Declare exact production SDK/data practices after reviewing Supabase, PowerSync, RevenueCat, Google Maps/Places, storage, and OCR/report services.
4. Create subscriptions with the existing Plus and Family product IDs. Set prices, base plans/offers, regions, cancellation/restore behaviour, and tester access.
5. Connect the Google Play app in RevenueCat, import/map products to the existing entitlements/current offering, and set the `goog_…` public SDK key in EAS preview and production environments.
6. Create an internal testing release first. Use Google license testers and test each purchase outcome, restore, expiry, billing issue, refund, and cross-device entitlement update.
7. Build an Android App Bundle with EAS production. Never use the debug keystore for a store artifact. Enroll in Play App Signing when prompted and protect the upload key.
8. Complete store listing, content rating, target audience, ads declaration, Data safety, privacy policy URL, access instructions, and tester feedback before promoting a release.

Google Play requires new apps and updates to target Android 16/API 36 from 2026-08-31. The resolved native project already targets 36; recheck this before upload: <https://developer.android.com/google/play/requirements/target-sdk>.
