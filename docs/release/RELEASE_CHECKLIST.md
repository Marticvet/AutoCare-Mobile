# v1.0 release gate checklist

Use this checklist only after completing the account-dependent steps in the setup guides.

## Source and build gate

- [x] `package-lock.json` supports deterministic `npm ci` installation.
- [x] `npm run release:check` exists and passes in the audited workspace.
- [x] EAS development profile is an explicit development client.
- [x] A distinct `testflight` App Store-distribution profile is isolated from preview/production, omits the Test Store key, and enables only the explicitly approved internal social-auth channel. Expo config and the EAS pre-install hook reject any injected Test Store key.
- [x] TestFlight has no working-purchase fallback: absent a real `appl_…` key, RevenueCat and purchase/restore controls are disabled rather than using Test Store.
- [x] Preview/production profiles omit `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` because EAS rejects empty profile values.
- [x] EAS and local native-release preflight refuse Test Store keys; the test key is omitted from release Expo config.
- [x] Android resolves compile/target SDK 36.
- [x] iOS project targets iOS 15.1 and is buildable with Xcode 26.3.
- [x] Run `npm ci` on Node 22.23.4 with npm 10.9.2.
- [x] Run `npm run release:doctor` on that supported runtime; retain the two documented real-device/native-folder findings.
- [ ] Build iOS and Android production artifacts with EAS after platform credentials are configured.
- [ ] Build and install the first internal iOS TestFlight artifact, then validate its social-auth, Maps, email/recovery, and intentionally disabled billing behavior on a physical iPhone.

## Security and data gate

- [x] Client source contains no `EXPO_PUBLIC_` service-role, RevenueCat secret, or Stripe secret reference.
- [x] Account deletion is in-app and needs a two-step confirmation plus a valid session.
- [x] Auth/logout clears the local PowerSync database.
- [x] Offline writes remain queued after upload failures instead of being discarded.
- [x] A failed or remote local sign-out clears PowerSync before another account can use cached rows (isolated regression tests).
- [x] `20261105000000_family_expiry_access_safety.sql` is deployed alone to `zgevytforozvlxflbsup`. Verify with disposable active/expired/renewed Family owner/member accounts that former members cannot read garage/member metadata or manage members after expiry while history is retained.
- [x] RevenueCat identity calls are serialized so a delayed sign-out cannot clear a subsequent sign-in.
- [x] Notification actions ignore stale callbacks during logout/account switches.
- [x] Apple native and Google OAuth/PKCE sign-in paths are implemented behind `EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=false`; explicit identity-linking code never matches or merges accounts in the app by email.
- [x] Local iOS development can expose Google only with `EXPO_PUBLIC_ENABLE_SOCIAL_AUTH=true`, `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=true`, and `EXPO_PUBLIC_ENABLE_APPLE_AUTH=false`; the separately named internal TestFlight channel may enable both verified providers, while preview and production force all providers off.
- [x] Supabase Auth explicitly uses PKCE; social callbacks exchange authorization codes only and reject token-bearing, expired, invalid, and failed callbacks without creating a local session (focused regression tests).
- [x] An Apple name supplied at first authorization is saved without overwriting a non-empty profile name; the update retains the current Supabase UUID and does not use relay email as a merge key.
- [x] Local static audit found no privileged Supabase or RevenueCat webhook credential reference in mobile-client source.
- [x] Core PowerSync tables are represented in both `powersync/sync-config.yaml` and the local schema (deployment remains unverified).
- [x] Verify the authorized Family-expiry migration is present in the target project; no other migration was deployed in that operation.
- [x] Deployed the compiler-validated Family-expiry PowerSync configuration to AutoCare EU as active v8 / `aafc`; Health is clear. Device replication/removal acceptance remains pending.
- [ ] Verify two non-admin users cannot select/update/delete each other's rows or document objects.
- [ ] Verify account deletion removes the auth user and all owned documents in a non-production project.
- [x] Set the server-only `REVENUECAT_WEBHOOK_AUTHORIZATION` secret for the sandbox-only webhook; `sync-entitlements` security was not changed.
- [x] Verify the deployed webhook rejects unauthenticated POST requests with HTTP 401.
- [x] Resolve webhook Authorization: controlled delivery authenticates; temporary diagnostic removed.
- [x] Verify genuine Test Store Renewal/Expiration events enter `billing_webhook_events` and retries do not duplicate an event ID.
- [x] Verify `REVENUECAT_SECRET_API_KEY` server-to-RevenueCat subscriber lookup, `processed_at`, Plus/Family mirror refresh, revocation, and delayed-ordering behavior through Test Store only.

## Product acceptance gate

- [ ] Test registration, login, reset-password deep link, session restore, sign-out, export, and deletion on iOS and Android.
- [ ] After approved provider setup, test Apple first sign-in/name/private relay/cancellation, Google success/cancellation, verified-email collision handling, and explicit linking on physical iOS. Record the original UUID and verify vehicles, expenses, Family access, and billing identity remain attached. Keep social auth disabled until this passes.
- [ ] Test vehicle, all expense types, documents, reminders, reports, imports, maps, and empty/error/offline states.
- [ ] Test create/update/delete offline, force-close, relaunch, reconnect, retry, duplicate avoidance, conflicts, and account isolation. Current blockers: CoreSimulatorService refuses connections and the running Android AVD is not exposed as a supported controllable UI surface. Do not change host networking; use a recovered simulator, supported Android surface, or physical device.
- [ ] Decide and test a conflict policy for concurrent edits. Current upload semantics are server-arrival last-write-wins; no version/merge UI exists.
- [ ] Test notifications and notification actions on physical devices.
- [ ] Test Dynamic Type/text scaling, VoiceOver/TalkBack labels, contrast, smallest supported screen, and tablet layout.
- [ ] Test real-store purchase, cancellation, restore, expiration, refund, and cross-device restoration in both platform sandboxes.
- [ ] Verify Fleet shared-garage synchronization remains compatible with the Family-only v8 sharing predicates before release.

### Required manual authentication acceptance

For each of English, German, and Bulgarian on iOS and Android: register an approved disposable account; confirm the user-visible verification state matches the configured Supabase setting; sign in with a valid password; request and complete a password reset through `autocare://reset-password`; open an expired or malformed link and verify a recoverable error; force-quit/relaunch and confirm the session restores; sign out, sign in as a different approved account, and confirm no prior local data appears; then complete the two-step Settings deletion flow and confirm the Apple-subscription-management notice is shown. After the social provider release prerequisites are approved, also test native Apple first login/name persistence, Hide My Email/private relay, cancellation, Google OAuth cancellation/success, a failed/expired OAuth callback, and explicit linking from the original account. Before and after linking, record the disposable account UUID and confirm its vehicles, expenses, Family access, and billing identity are unchanged. Do not run this against an existing customer without separate authorization.

### Required manual offline and Family acceptance

Using approved disposable accounts only: create and edit a vehicle and each supported expense type while offline; force-quit/relaunch before reconnecting; reconnect and confirm exactly one of each queued write appears remotely; issue a competing edit from a second device and record the approved conflict outcome; create a Family owner/member pair, verify active sharing and permission boundaries, revoke access, then expire/downgrade and renew the owner entitlement. Confirm both direct access and the former member's local cache are removed, while owner data remains. Record device model, OS, network transition, account UUIDs, and screenshots/log references without retaining credentials.

## Store gate

- [ ] Finalize approved Privacy Policy, Terms, and Support URLs and set their EAS environment variables.
- [ ] Finalize products/prices, connect each store app in RevenueCat, and set `appl_`/`goog_` public keys.
- [ ] Complete the metadata and questionnaires under `docs/release/store/` from legal/business evidence.
- [ ] Capture real, clean screenshots with the documented workflow.
- [ ] Create reviewer account/instructions without committing credentials.
- [ ] Complete Apple/Google declaration forms and submit only after every preceding item passes.

## Remaining tasks requiring Apple Developer or Google Play accounts

These are account-dependent, not source-code blockers.

1. **Apple Developer Program / App Store Connect:** enroll, register `com.marticvet.autocare`, create auto-renewable subscription products with the existing identifiers, connect the Apple app in RevenueCat, configure signing, set the iOS `appl_…` key in EAS preview/production, test StoreKit sandbox/TestFlight, complete App Store Connect forms, and upload a signed build.
2. **Google Play Console:** create the app with package `com.marticvet.autocare`, create matching subscriptions, connect Google Play in RevenueCat, set the Android `goog_…` key in EAS preview/production, use an internal track with license testers, complete Play declarations, and upload a Play App Signing artifact.
3. **Apple/Google/Supabase authentication configuration:** enable the Sign in with Apple capability and configure its Supabase provider; configure the Google OAuth web client callback and provider secret in Supabase; allow `autocare://auth/callback` and `autocare://reset-password`; enable Confirm email and manual identity linking; then enable only the non-secret `EXPO_PUBLIC_ENABLE_SOCIAL_AUTH` EAS flag. Test before release on physical iOS.

Prerequisites for either path: approved legal URLs, final products/prices, a test plan, and successful staging/device acceptance. See `APPLE_DEVELOPER_SETUP.md` and `GOOGLE_PLAY_SETUP.md` for the ordered instructions.

## Other unavailable access or decisions

- **Staging credentials:** required to verify deployed migrations, RLS, Storage policies, Edge Functions, PowerSync streams, and account deletion. No staging project credentials were supplied.
- **RevenueCat dashboard access:** required to verify Test Store catalog, purchase events, customer identity, and webhook deployment. No dashboard credentials were supplied.
- **Physical devices:** required for real notification, camera/photo, location, biometric, background/resume, and platform auth validation.
- **Business/legal approval:** required for URLs, pricing, consumer disclosures, trader information, and final store privacy/data-safety answers.
- **Local database runtime:** Docker is unavailable on this host, so Supabase migrations could not be applied or exercised locally.
