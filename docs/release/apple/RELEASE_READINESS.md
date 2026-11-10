# Apple production preparation — 2026-11-09

Verdict: Not ready for App Review. Local source is Expo SDK 54 / React Native 0.81.5; no GitHub source replaced it. Existing dirty release-check work was preserved. No new external service mutation, membership purchase, account creation/deletion, EAS build/inspection or submission was performed.

Engineering in this preparation focuses first on confirmed reminder reconciliation defects: serialized OS operations, differential updates, foreground permission recovery, removal cleanup, visible failures, and active-reminder notification-action validation. See NOTIFICATION_INVESTIGATION.md for limits and IOS_ACCEPTANCE_TESTS.md for evidence categories. Historical account/auth/offline/billing tests are reused, not represented as new device acceptance.

Release profiles preserve development Test Store billing; distribution rejects injected test keys; TestFlight with no real Apple key disables purchases. Production/preview social auth remains off; owner must approve the production provider policy after signed-binary acceptance. Production platform keys, legal links and StoreKit configuration remain external gates. Signing/provisioning is owner-confirmed, not independently revalidated here.

Assets: current 1024px opaque sRGB icon/native catalog already exist. English listing, review handoff and screenshot procedure are prepared here. No completed screenshot set or review account is claimed.

Order: validate notifications on-device; authorize and validate outstanding backend deletion/monitoring changes; finish Apple products/RevenueCat and legal approvals; verify production auth policy and environments; run full physical/two-account matrix; capture authentic screenshots and finish Apple forms/review access; build approved profile; inspect signed artifact; upload only with explicit approval. No EAS inspect is needed: prior inspection incremented the remote version and should not be repeated casually.

## Validation observed

`npm run release:check`: release configuration and TypeScript passed; 26 Jest suites / 114 tests passed. ESLint completed with zero errors; three test import-order warnings were subsequently corrected (101 existing warnings remain). `git diff --check` passed. `npm run release:doctor`: 16/18, with existing native-folder synchronization and QuickSQLite New Architecture metadata findings. Native source confirms team Y4ABSA46HB, bundle com.marticvet.autocare and iOS 15.1 in both configurations. No booted simulator was available from `xcrun simctl list devices booted`; no new native build, screenshots or device delivery is claimed.

Scope limit: the requested whole-application performance, memory, accessibility and real-service acceptance audit is not complete. Existing source gates cover auth, deletion, billing guards, offline connector and Family expiry, but do not establish every CRUD flow or deployed security policy. Follow IOS_ACCEPTANCE_TESTS.md before claiming production readiness.
