# v1.0 technical handoff

## Release verdict

**Not ready to submit.** The existing Supabase project has passed authenticated CRUD/RLS and online PowerSync acceptance. RevenueCat Test Store validates all four configured package purchase flows, synchronous entitlement mirrors, and sandbox-only webhook lifecycle processing. The Family-expiry migration and PowerSync configuration are deployed; release remains blocked by their real active/expired/renewed owner-member acceptance, email-confirmation enablement, authenticated offline/conflict acceptance, signed/platform builds, and real-store testing—not by supported-runtime validation or Test Store webhook delivery.

## RevenueCat account-deletion infrastructure — deployed and accepted

The queue/function workflow is accepted, but automatic scheduler delivery is **not**. A Cloudflare Worker activation attempt produced one authenticated healthy Cron event, then no second event over four expected intervals. Cron was disabled and GitHub Actions remains protected manual fallback. Cloudflare Logs/Issues are enabled, but an operator alert destination and a missed-run heartbeat remain required before automatic retries can be relied upon.

The deletion queue migration `20261105010000_revenuecat_deletion_queue.sql` and only the required account-deletion functions are deployed to `zgevytforozvlxflbsup`. Deletion records a tombstone and queue request before data/Auth removal, confirms Auth deletion, then requests RevenueCat v1 deletion asynchronously. `200` means requested; a later `404` means confirmed. The authorized disposable-account acceptance reached `confirmed` at `2026-11-06 08:38:34 UTC`; Auth and billing-mirror data remained absent.

Confirmed tombstones block both entitlement sync and delayed webhook processing before any RevenueCat customer lookup or billing upsert. A one-time authenticated Test Store `RENEWAL` delivery for the same deleted UUID was recorded as intentionally ignored with no billing recreation. The temporary Edge Function and manual runner used for that proof were removed immediately afterward.

The protected GitHub Actions retry workflow declares a five-minute schedule and retains manual dispatch, `x-cron-secret` authentication, no workflow permissions, a five-minute timeout, and non-cancelling concurrency. A failed outcome persistence returns `503`; owner-confirmed failure notifications are configured. GitHub Actions had not produced an automatic run more than 30 minutes after the schedule change, so verify the first scheduled invocation before release. At the check, aggregate queue health was one confirmed request and zero due, failed, or stale requests.

Do not add a purge job yet. Confirmed-record 30-day retention is only a proposal; failed-request handling, tombstone retention, the review owner, and an approved purge criterion remain legal/owner decisions.

## Changed release infrastructure

- `eas.json`: development client and explicit development/preview/production environments.
- `app.config.js` and `scripts/verify-local-release-config.cjs`: automatic `local-release` separation for non-distributable iOS simulator Release builds; all RevenueCat keys are omitted while preview/production retain their strict Test Store rejection.
- `scripts/validate-release-config.cjs`: EAS release billing guard.
- `scripts/verify-release-configuration.cjs`: static release guard.
- `package.json`: `release:check`, `release:config`, `release:validate:billing`, and `release:doctor` commands.
- `.env.example`: public configuration template.
- `plugins/withForegroundLocationOnly.js` and native Info.plist: foreground-only location declarations.
- `plugins/withAndroidMapsKeyPlaceholder.js`: Android Maps manifest placeholder without embedding a developer `.env` key in tracked native source.
- `src/billing/revenueCat.ts`: serialized RevenueCat identity operations prevent a delayed logout from clearing a subsequent login.
- `src/providers/ReminderNotificationProvider.tsx`: stale notification callbacks no longer act during logout/account changes.
- `src/providers/AuthProvider.tsx` and `src/utils/offlineSession.ts`: every local, remote, or failed sign-out clears PowerSync before another user can access cached rows; isolated regression tests cover the failure path.
- `supabase/migrations/20261105000000_family_expiry_access_safety.sql`: deployed alone to `zgevytforozvlxflbsup`. It preserves owner data and membership history while removing former members' metadata and management access.
- `powersync/sync-config.yaml`: deployed to AutoCare EU as active Sync Streams v8 / `aafc`. The edition-3 stream uses inline data-query joins/subqueries (not the restricted `with:` parameter queries) and server-maintained `billing_customers.status/plan` plus active memberships to decide shared-data access; it never reads a client premium flag or current time.
- `supabase/rollback/20261105000000_family_expiry_access_safety.rollback.sql`: tracked emergency rollback source, deliberately outside `supabase/migrations`. It restores verified pre-fix function bodies and reopens the vulnerability, so it may only be copied into a new, approved migration after confirming live state.
- `supabase/functions/_shared/revenuecat-webhook.ts` and `revenuecat-mirror.ts`: isolated webhook authentication/identity and subscriber-mirror logic with regression tests; mandatory Authorization, optional configured HMAC, generic errors, event-ID idempotency, and authoritative subscriber re-fetching.

## Exact handoff sequence

1. Supported-runtime validation is complete: Node 22.23.4/npm 10.9.2 passed `npm ci` and `release:check`; `release:doctor` is 16/18 with the documented native-folder and Quick SQLite device-coverage findings.
2. Restore a supported interactive device surface, then run the Family member active/expired/renewal, direct-RPC, and offline-cache cases in `RELEASE_CHECKLIST.md` using an existing or newly approved disposable active owner/member pair. CoreSimulatorService currently refuses connections and the Android AVD is not exposed as a controllable native UI surface; no additional account or RevenueCat state was changed to work around either limitation.
3. Finish RevenueCat Test Store and backend webhook acceptance per `REVENUECAT_SETUP.md`.
4. Publish approved Privacy/Terms/Support pages and set the three public URLs in each EAS environment.
5. Complete the Apple and Google setup guides, connect real products to RevenueCat, and add only the matching `appl_…`/`goog_…` EAS environment key.
6. Run device/sandbox acceptance, capture actual screenshots, complete store forms, build signed artifacts, and submit.

No credentials, review accounts, or production mutations were created during this preparation.

The final source gate, an unsigned Android Release build, and an unsigned iOS Simulator Release build passed. Their exact scope and limits are recorded in `TEST_REPORT.md`; the Android output remains unsuitable for distribution because it is unsigned.

The final source gate rerun on Node 22.23.4/npm 10.9.2 passed release configuration, typecheck, 15 Jest suites / 54 tests, and lint with 0 errors (101 legacy warnings remain). The current unsigned Android artifact is SHA-256 `17f80722403f2fbbec893dc408cee461c2d0101fd7782a16624c8bef4af6a655`; the refreshed Android and iOS artifacts were byte-scanned and do not contain the local RevenueCat Test Store key.

For local iOS smoke testing, use `npm run ios:release:simulator` (or the equivalent `npx expo run:ios --configuration Release` when `.env` remains `development`). This produces `local-release`, strips all RevenueCat keys, disables billing and entitlement-mirror requests, locks premium access, and must never be distributed. EAS preview and production must use their respective profiles, cleared Test Store key, matching `appl_…`/`goog_…` public key, and platform credentials.

## Existing-project acceptance evidence added 2026-11-04

- Confirmed project ref: `zgevytforozvlxflbsup` (Supabase UI labels it production). Authenticated disposable accounts passed vehicle/reminder CRUD, cross-account RLS isolation, and PowerSync upload from the Debug simulator. See `TEST_REPORT.md` and the approval-gated inventory in `PRE_RELEASE_CLEANUP.md`.
- The deployed `sync-entitlements` returned 200 and persisted the expected paid records: Plus Yearly UUID `aba76351-23ba-4653-b9e1-0eb3f3ad0e2a` has `plus_yearly` / only `plus_features`; Family Monthly UUID `88084c61-c696-4cef-90e6-97384e28e6dc` has `family_monthly` / both `plus_features` and `shared_garage`, and its garage became Family with six seats. This proves caller authentication, server-side RevenueCat lookup, and the owner-visible paid mirror path. A direct Free-account Family-invite RPC was rejected with `42501`, so the tested Shared Garage route does not trust client-side state.
- RevenueCat Test Store acceptance on the existing Debug build used Supabase App User ID `33fe0435-ebf7-47cd-9a59-76fc13b32b10`. The `default` offering contains all four expected packages. Simulated Plus Monthly unlocked `plus_features` (and no `shared_garage` before the Family purchase), persisted through app restart, restored successfully, and unlocked Documents. Simulated Family Yearly activated both `plus_features` and `shared_garage`, restored successfully, and unlocked the six-seat Garage members screen. RevenueCat records are visible only after enabling **Sandbox data** on the customer profile; these are Test Store records, not real Apple transactions.
- The separate-account workflow completed the remaining package coverage. The sandbox history now confirms accelerated Plus Yearly, Family Yearly, and Family Monthly expiry/revocation. After the raw V1 Secret API key was configured, `sync-entitlements` returned 200 for Family Monthly; its mirror became expired with no entitlement IDs and its garage downgraded from Family/six seats to personal/one seat. Test Store management still produced no actionable cancellation interface, and refund/real-store lifecycle validation remains outstanding.
- The rebuilt Debug app was used to restore the existing Family Test Store purchase, and it now correctly says “Your AutoCare Family purchase was restored.”
- Separate alternative-plan Test Store acceptance passed. Plus Yearly (`aba76351-23ba-4653-b9e1-0eb3f3ad0e2a`) showed Plus-only feature access, persisted through Debug restart, restored, appeared in RevenueCat Sandbox Recent transactions, and independently mirrored as active `plus_yearly` with only `plus_features`. Family Monthly (`88084c61-c696-4cef-90e6-97384e28e6dc`) showed Family shared-garage access with six seats, persisted/recovered, appeared in RevenueCat Sandbox Recent transactions, and independently mirrored as active `family_monthly` with both entitlements. Cleanup scope is recorded in `PRE_RELEASE_CLEANUP.md`.
- The current AutoCare RevenueCat project supports webhook configuration. `AutoCare Hub Supabase Test Store` is configured only for **Sandbox**, **Test Store (Test Store)**, and the approved Supabase endpoint. Only `revenuecat-webhook --no-verify-jwt` was deployed. After owner-coordinated Authorization and raw V1 Secret API-key correction, genuine Renewal/Expiration retries returned HTTP 200, set `processed_at` only after successful refresh, and preserved one ledger row per event ID. Authoritative subscriber re-fetch prevented delayed Renewal retries from restoring expired Plus access.
- Supabase Auth currently has **Confirm email unchecked** (auto-confirm enabled). The app already handles the no-session sign-up response and the signup trigger creates a profile/personal garage. Before public release, configure the template/redirect URL, enable Confirm email, and run verified-email registration/sign-in acceptance in staging.
- Android Maps build-time secret wiring passed: Gradle resolves `GOOGLE_MAPS_ANDROID_API_KEY` into a manifest placeholder, while the configured key remains absent from tracked source. Configure the restricted production key as an EAS secret before a signed build.
- No existing Privacy Policy, Terms, or Support page was present in the repository. Draft website content is in `docs/release/web/`; `PUBLICATION_REQUIREMENTS.md` lists the owner/legal approvals required before deployment.
- Only the previously captured real login screenshot is available. Complete authenticated screenshots cannot be captured safely without a sanitized demo account.
- Supabase CLI is present but Docker is unavailable, so no local database stack could be started. SQL migrations/policies and PowerSync coverage were statically audited only; this is not migration/RLS acceptance.

## RevenueCat webhook activation status

The exact current test target is Supabase project ref `zgevytforozvlxflbsup` (labelled **production** in the console). Its endpoint is `https://zgevytforozvlxflbsup.supabase.co/functions/v1/revenuecat-webhook`. Do **not** point a RevenueCat production purchase stream at this endpoint until a separately approved production plan exists.

RevenueCat's AutoCare project supports webhook configuration, and no plan change/payment was requested. The configured webhook is sandbox-only and Test-Store-app-filtered. The post-create detail page has an optional HMAC control; it is off and no signing secret exists. The source requires Authorization, supports HMAC only when a server secret is deliberately configured, and never trusts arbitrary entitlement claims.

Completed: target check, required-schema behavioral check, server-side Authorization secret setup, deployment of only `revenuecat-webhook --no-verify-jwt`, and sandbox/Test Store configuration. `sync-entitlements` retains Supabase JWT verification and was not deployed.

Completed: the owner-coordinated webhook Authorization replacement passed authentication. A temporary category-only diagnostic confirmed it, then was removed and only `revenuecat-webhook` redeployed. The owner subsequently set the raw V1 `REVENUECAT_SECRET_API_KEY`; genuine Test Store Renewal and Expiration retries returned HTTP 200, populated `processed_at` after subscriber refresh, updated Plus/Family expiry state, and retained one ledger row per event ID.

No Test Store webhook credential blocker remains. The generic dashboard test still uses a generated non-customer UUID and is intentionally not a lifecycle-success signal. This acceptance does not cover a Test Store cancellation control (none is exposed), refunds, or any Apple/Google real-store payment flow.

Rollback is configuration-first: disable the sandbox webhook in RevenueCat (or remove only that one configuration), then remove the `REVENUECAT_WEBHOOK_AUTHORIZATION` secret and redeploy only `revenuecat-webhook` if a function rollback is required. This stops new deliveries while preserving `billing_webhook_events` and the authoritative billing mirror for diagnosis; do not delete ledger or customer records as rollback.

## Remaining tasks requiring Apple Developer or Google Play accounts

### Apple Developer / App Store Connect

Enroll, register the existing App ID, create matching subscription products, connect RevenueCat, configure signing and the `appl_…` public key in EAS, run StoreKit sandbox/TestFlight acceptance, complete App Store Connect declarations, and upload the signed artifact. Detailed sequence: `APPLE_DEVELOPER_SETUP.md`.

### Google Play Console

Create the existing package, set up matching subscriptions, connect RevenueCat, configure the `goog_…` public key in EAS, run internal-track billing acceptance, complete Play declarations, enroll in Play App Signing, and upload the AAB. Detailed sequence: `GOOGLE_PLAY_SETUP.md`.

## Separately blocked by unavailable access or decisions

- The previous simulator relaunch check was online only. In the current post-deployment attempt, CoreSimulatorService refused host connections and the running Android Pixel 8 API 35 AVD was not exposed as a controllable native UI surface. The Debug APK remains installed, but no account, session, test record, or host-network change was made through an unsupported route. Offline queue/reconnect/conflict/account-isolation acceptance remains blocked pending a supported interactive Android surface, recovered iOS Simulator, or physical device.
- No conflict policy has been approved: direct PowerSync uploads use last accepted server write semantics. Decide whether that is acceptable for each record type or add versioning/explicit resolution, then run a two-device conflict test.
- Family expiry preserves the owner’s garage/data and current data-table RLS denies former members. Migration `20261105000000` is deployed and closes retained-member metadata (including self-row reads) and membership-management access. The paired PowerSync configuration is active as v8 / `aafc`, based only on server-maintained membership and Family billing state. Health is clear. Complete real active/expired/renewed member and device-cache cases before release; CoreSimulatorService is unavailable and those cases were not fabricated.
- The deployed v8 member-sharing predicates are Family-only. Fleet shared-garage compatibility was not part of the live acceptance and must be confirmed with an authorized Fleet owner/member pair before release; do not infer Fleet behavior from the Family result.
- RevenueCat Test Store webhook delivery and subscriber synchronization are accepted; only real-store/platform billing validation remains.
- Physical devices are needed for platform permissions, notifications, background state, social sign-in, and real-store billing.
- Owner/legal approval is needed for public URLs, product pricing, consumer text, trader details, and final privacy declarations.
