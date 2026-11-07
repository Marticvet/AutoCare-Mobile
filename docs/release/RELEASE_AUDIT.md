# AutoCare Mobile v1.0 release audit

Audit date: 2026-11-04. This is a source and local-build audit; it is not a substitute for a store review, backend deployment review, or physical-device acceptance test.

## Verified implementation

- **VERIFIED — stack and toolchain.** `package.json` pins Expo SDK 54.0.37 (range `~54.0.0`), React Native 0.81.5, React 19.1.0, TypeScript 5.9.3, `@powersync/react-native` 1.35.10, Supabase JS 2.114.0, and RevenueCat React Native Purchases 10.8.1. The checked native project resolves Android `compileSdkVersion` and `targetSdkVersion` to 36. Xcode 26.3 is installed locally. Expo SDK 54 is compatible with React Native 0.81; no broad SDK upgrade is justified for this release.
- **VERIFIED — entry and navigation.** `index.js` registers `App.tsx`. The active app uses typed React Navigation native-stack and five bottom tabs: Dashboard, Vehicles, Expenses, Reminders, and More. Auth has Login, Register, Forgot Password, and Reset Password routes. The root stack covers vehicle, expense, reminder, document, profile, settings, nearby, paywall, subscription, garage, import, ownership, trips, scheduled reports, and checklists.
- **VERIFIED — authentication and deletion.** Supabase Auth persists sessions in AsyncStorage, enables token refresh while active, supports password-recovery deep links (`autocare://reset-password`), and clears local PowerSync data on sign-out. Settings exposes data export and a double-confirmed account deletion action. The authenticated `delete-account` Edge Function verifies the bearer user, removes their document objects, then deletes that auth user.
- **VERIFIED — data and authorization design.** The migrations enable RLS for user-domain tables, revoke broad grants, and add owner/garage role checks plus RLS for shared garages and storage. RevenueCat/Stripe state is server-mirrored in `billing_customers`; the client does not treat a local flag as payment truth. The audit did not connect to the configured Supabase instance, so deployed migration state and live-policy behaviour remain manual tests.
- **VERIFIED — offline design.** PowerSync uses `autocare.sqlite`, waits for database readiness, connects after a session exists, persists queued CRUD operations, retries failed uploads by leaving the transaction uncompleted, and clears the local database at logout. Screens read Kysely/PowerSync live queries. The initial-sync gate permits cached/offline continuation after a delay.
- **VERIFIED — billing design.** A signed-in Supabase UUID is the RevenueCat App User ID. The provider configures Purchases once, logs in on identity change, logs out on sign-out, loads offerings/customer info, refreshes the trusted mirror, handles purchase cancellation, restore, management, network failures, and customer-info listeners. Plus and Family entitlement IDs are `plus_features` and `shared_garage`; Fleet is server/Stripe-managed.
- **VERIFIED — notification, deep-link, and permissions design.** Reminders are scheduled locally and include open/complete actions. The app requests foreground location only for the user-initiated nearby flow. Camera/photo access is for documents and receipts. `autocare` is configured on both platforms.
- **VERIFIED — release identity.** App version is 1.0.0, iOS build number 1, Android version code 1, bundle/package identifier `com.marticvet.autocare`, and scheme `autocare`.

## Fixes made by this preparation

- **VERIFIED — Test Store release protection.** Development is now explicitly an EAS development-client profile. Preview and production clear the Test Store key. An EAS pre-install hook rejects a Test Store key and requires the matching `appl_` or `goog_` RevenueCat public key for preview/production artifacts. `npm run release:check` verifies the static release configuration, types, tests, and lint.
- **VERIFIED — least-privilege location declaration.** The app only calls foreground Expo Location APIs. The generated iOS project and prebuild plugin now remove stale Always/background location descriptions so the permission declaration matches actual behaviour.

## Findings requiring follow-up

- **REQUIRES FIX — Node version before release/CI.** The local host is Node 26.7.0/npm 12.0.2, while the project pins Node `>=20.19 <23` and npm 10.9.2. Use Node 20 or 22 and npm 10.9.2 for the final clean install and CI build. This is an environment blocker, not a source defect.
- **REQUIRES MANUAL TEST — backend deployment.** Confirm every migration, Edge Function, PowerSync Sync Streams configuration, Storage bucket policy, and RevenueCat webhook has been deployed to the same non-production/prod project as intended. No destructive database action was performed in this audit.
- **REQUIRES MANUAL TEST — physical device flows.** Apple/Google sign-in, notifications, image/document permissions, location, offline reconnect, iOS purchase sheet, Android Billing, deep-link recovery, and data export require real devices/accounts.
- **REQUIRES MANUAL TEST — legacy lint warnings.** `npm run lint` succeeds with 102 warnings in older screens/navigators that are not imported by `App.tsx`; no lint errors occurred. They should be retired or cleaned after v1.0 rather than changing inactive code at release time.
- **REQUIRES STORE ACCOUNT — store billing and distribution.** App Store Connect, Google Play Console, platform RevenueCat keys, store products, signing, TestFlight/internal testing, and store submission cannot be completed without the respective accounts.
- **REQUIRES LEGAL/BUSINESS DECISION — public URLs and pricing.** Privacy Policy, Terms, Support URLs, final subscription price/duration/country availability, seller/trader details, and the final Store privacy declarations need owner/legal approval. The app intentionally does not invent them.
- **OPTIONAL — remote push.** The current app uses local reminders only and deliberately removes APNs entitlement. Add remote push only with a paid Apple Developer Program team and a separate product/security review.

## Store/toolchain evidence

Apple requires App Store Connect uploads built with Xcode 26 or later and an iOS 26 SDK as of April 2026: <https://developer.apple.com/news/upcoming-requirements/?id=04282026a>. The installed Xcode 26.3 meets that baseline. Google Play requires new apps and updates to target Android 16/API 36 from 2026-08-31: <https://developer.android.com/google/play/requirements/target-sdk>. The checked Gradle project resolves API 36.
