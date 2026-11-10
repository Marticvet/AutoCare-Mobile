# RevenueCat release setup

## Existing implementation

`SubscriptionProvider` identifies RevenueCat with the authenticated Supabase UUID. It refreshes CustomerInfo and offerings, listens for entitlement changes, mirrors trusted status through `sync-entitlements`, restores purchases, opens subscription management, and does not unlock production features through a mock flag. Existing entitlement IDs are:

| Plan | Entitlements | Existing product IDs |
| --- | --- | --- |
| Plus | `plus_features` | `autocare_plus_monthly`, `autocare_plus_yearly` |
| Family | `plus_features`, `shared_garage` | `autocare_family_monthly`, `autocare_family_yearly` |
| Fleet | server-managed | Stripe boundary; do not map to RevenueCat without a business change |

Do not rename these identifiers without a data migration and a product decision.

## Environment separation

| Build | Key allowed | Guard |
| --- | --- | --- |
| Development client | RevenueCat Test Store `test_…` key | `__DEV__` path; EAS development profile is `developmentClient: true` |
| Local Apple Sandbox build | Apple App Store `appl_…` key | Explicit `apple-sandbox` channel; rejects a Test Store key and is never a distribution artifact |
| Local iOS Release simulator | no RevenueCat key | `local-release` strips Test Store/platform keys, disables billing mirror calls, and locks premium access; never distribute |
| Preview | matching platform `appl_…` / `goog_…` key | Test key is cleared and preflight rejects it |
| Production | matching platform `appl_…` / `goog_…` key | Test key is cleared and preflight rejects it |

Set non-secret public SDK keys in the matching EAS environment. The pre-install hook verifies keys only when `EAS_BUILD_PLATFORM` is present. Test locally with:

```bash
EXPO_PUBLIC_APP_ENV=production EAS_BUILD_PLATFORM=ios npm run release:validate:billing
EXPO_PUBLIC_APP_ENV=production EAS_BUILD_PLATFORM=android npm run release:validate:billing
```

For a local development-signed Apple Sandbox build, export the `appl_…` public SDK key only in the invoking shell (or inject it through the approved EAS environment), then run:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY='appl_…' npm run ios:apple-sandbox
```

This command clears the Test Store variable and fails if an `appl_…` key is not supplied. It does not create, upload, or modify a TestFlight build.

The command must fail until the corresponding real public key is present. Never put `sk_…`, store shared secrets, or service-role credentials in a client environment variable.

## Dashboard actions now (no Apple/Google account needed)

### Observed Test Store state — 2026-11-04

The Debug Test Store offering `default` now contains all four expected packages, and separate disposable Supabase users completed Plus Monthly, Plus Yearly, Family Monthly, and Family Yearly purchases. RevenueCat CustomerInfo, restored sessions, the dashboard sandbox ledger, and the deployed synchronous mirror verified the expected Plus/Family entitlement mappings. See `TEST_REPORT.md` for test-account evidence and remaining lifecycle limits.

The approved mapping is:

| Product | Package | Required active entitlements |
| --- | --- | --- |
| `autocare_plus_monthly` | `monthly` | `plus_features` |
| `autocare_plus_yearly` | `annual` | `plus_features` |
| `autocare_family_monthly` | `family_monthly` | `plus_features`, `shared_garage` |
| `autocare_family_yearly` | `family_yearly` | `plus_features`, `shared_garage` |

The Paywall identifies Family packages by the word `family` in the package/product/title, so retain that naming. Test Store access remains development-only; it must never enter a preview or production build. Webhook delivery, terminal revocation, and refund/cancellation remain separate validation work.

RevenueCat documents that Test Store works with the installed RN SDK generation, but Test Store keys must never enter a release build: <https://www.revenuecat.com/docs/getting-started/configuring-sdk>.

### Apple Sandbox simulator observation — 2026-11-10

The EAS `preview` environment supplied an `appl_…` Apple App Store public SDK key to a local `apple-sandbox` Debug build, with no Test Store key. The app configured RevenueCat but `default` could not load any products: the SDK reported that none of the RevenueCat products could be fetched from App Store Connect or from a StoreKit configuration file. This repository has no `.storekit` file configured for the simulator.

Do not treat the existing Test Store prices or screenshots as Apple StoreKit evidence. For real App Store Connect metadata, prices, transactions, restores, and server notifications, use a dedicated physical iPhone with a Sandbox Apple Account and a development-signed Apple Sandbox build (or a separately authorized TestFlight test). Apple’s sandbox guidance is: <https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox>.

## Supabase webhook deployment and repair

The webhook source is `supabase/functions/revenuecat-webhook/index.ts`. Its canonical URL is:

```text
https://zgevytforozvlxflbsup.supabase.co/functions/v1/revenuecat-webhook
```

This is the pre-release target only; the Supabase console labels it production. The target was reconfirmed before deployment on 2026-11-04. Never point a production Apple or Google purchase stream at it.

It accepts **POST only**. It has `verify_jwt = false` in `supabase/config.toml` because RevenueCat does not send a Supabase user JWT; it instead requires an exact configured Authorization header before any event can reach the service-role billing mirror. The RevenueCat detail page also exposes an optional HMAC setting after a webhook exists. It is intentionally disabled for this test and no signing secret is configured. If enabled later, its generated secret must be securely set as `REVENUECAT_WEBHOOK_SIGNING_SECRET` and the function must be redeployed; otherwise the mandatory Authorization check remains the active authentication mechanism.

### Activation status — 2026-11-05

Only `revenuecat-webhook` was deployed with `--no-verify-jwt`; `sync-entitlements` was left unchanged. One RevenueCat webhook named `AutoCare Hub Supabase Test Store` exists at the canonical URL and is scoped to **Sandbox only**, **Test Store (Test Store)**, and all event types. An unauthenticated HTTP POST returns 401 as required. Following owner-coordinated Authorization replacement and raw V1 Secret API-key correction, genuine Test Store Renewal and Expiration retries returned HTTP 200. Their existing ledger rows have non-null `processed_at` only after authoritative subscriber refresh; duplicate deliveries retain a single event row. `sync-entitlements` also returned HTTP 200 for the expired Family Monthly customer and downgraded its garage to one seat. The generic dashboard test remains intentionally unprocessable because it uses a generated non-customer UUID.

To add Apple Sandbox support without disrupting Test Store, create a **separate** RevenueCat webhook for the Apple App Store app’s Sandbox events, pointed at the same canonical endpoint and using the already configured Authorization header. Keep the Test Store-only webhook unchanged. The handler identifies the Supabase UUID App User ID, deduplicates event IDs, and refreshes the subscriber from RevenueCat; no mobile or Edge Function code change is required. Do not enable production Apple events until the owner explicitly authorizes that stream.

### Required Supabase secrets

Set these only in the intended project. Never place them in `.env`, EAS, app config, or mobile source.

| Secret | Used by | Purpose |
| --- | --- | --- |
| `REVENUECAT_SECRET_API_KEY` | `sync-entitlements`, `revenuecat-webhook` | Server-side RevenueCat subscriber lookup |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | `revenuecat-webhook` | Exact value configured as the RevenueCat webhook Authorization header |

Supabase-managed `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used server-side by the functions. They must never be copied into client-facing variables.

Generate the Authorization value once on the operator's secure machine (for example, `openssl rand -base64 48`), prefix it consistently with `Bearer ` in both places, paste it directly into Supabase Edge Function secrets and the RevenueCat Authorization field, then discard it from terminal history and chat. Do not print or commit it. The webhook Authorization configuration is verified. `REVENUECAT_SECRET_API_KEY` is a distinct server-to-RevenueCat REST credential and must not be confused with, copied from, or replaced by the webhook Authorization value. The RevenueCat project `supabase` Secret API key uses API v1; because the function adds `Bearer ` itself, the Supabase secret must contain the raw key only. The owner configured it successfully on 2026-11-05; the deployed subscriber refresh then returned 200 for genuine Test Store customers.

### Exact deployment sequence

1. Authenticate/link the Supabase CLI to target `zgevytforozvlxflbsup`; confirm the project ref before every command. This was verified for the activation on 2026-11-04.
2. Do not apply migrations in this activation. Read-only deployed behavior already proves the required billing/membership schema: `billing_customers.entitlement_ids` and `is_admin`, `billing_webhook_events`, and Family garage fields/triggers exist. The CLI did not return a complete migration-history listing, so an owner with database access should still reconcile migration history before any later schema change.
3. In RevenueCat, create a webhook integration with the canonical URL above, configure a long random Authorization header value, select sandbox/Test Store events only for initial validation, and filter to the intended Test Store app. This configuration exists; first align its Authorization value securely.
4. Retain the already-working `REVENUECAT_SECRET_API_KEY` and set the new webhook secret without printing it:

   ```bash
   npx supabase secrets set REVENUECAT_SECRET_API_KEY='…'
   npx supabase secrets set REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer …'
   ```

5. Deploy only the webhook function (the deployed `sync-entitlements` function is already proven current enough for Test Store mirroring). This deployment completed:

   ```bash
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```

6. Confirm routing without sending customer data: an unauthenticated `POST` to the deployed webhook must return 401. Then use a RevenueCat Test Store delivery for a Supabase UUID App User ID. The generic dashboard test must include such an ID or this intentionally strict handler returns a failure.
7. Confirm exactly one `billing_webhook_events` row is processed for a delivery ID, then verify `billing_customers` contains the current RevenueCat subscriber state. Repeat a dashboard retry of the same event and test a delayed refund/expiration after a newer active entitlement.

The handler rejects invalid/missing authorization and events without a Supabase UUID identity before any billing row is changed. If the optional HMAC setting is deliberately enabled and a matching signing secret is configured, the handler also rejects malformed, stale, and invalid signatures. It records event IDs under a database primary key and refreshes the subscriber from RevenueCat rather than trusting event entitlement fields, making duplicate and out-of-order deliveries safe.

## Local automated coverage

The Jest suite uses no dashboard, keys, or network calls. It covers:

- RevenueCat production-key selection and sign-out/sign-in serialization.
- Webhook Authorization-header verification, optional HMAC verification/timestamp tolerance, malformed configuration, UUID identity filtering, and transfer participants.
- Subscriber-mirror Family precedence, cancellation, billing issue, expiration, refund, and delayed-event behaviour.

These are implementation tests only; they do not prove a deployed function, RevenueCat dashboard configuration, or real purchase lifecycle.

## Account-deletion queue — deployed and accepted

`delete-account` derives the RevenueCat App User ID only from the authenticated Supabase user UUID. It first writes a durable deletion tombstone and an ineligible queue entry, removes account data, deletes and confirms removal of the Supabase Auth user, then makes that queue entry eligible for RevenueCat API v1 `DELETE /subscribers/{app_user_id}`. No RevenueCat deletion is requested while the Supabase Auth user remains active. A `200` means deletion was requested; a later retry records `404` as confirmation. The tombstone blocks webhook and entitlement-sync lookups before and after completion, so late provider events cannot recreate billing records. It never calls an Apple cancellation endpoint, because deleting a RevenueCat customer does not cancel an Apple subscription.

Migration `20261105010000_revenuecat_deletion_queue.sql` is applied and `delete-account`, `process-revenuecat-deletion-retries`, `revenuecat-webhook`, and `sync-entitlements` are deployed with their intended JWT modes. `ACCOUNT_DELETION_RETRY_SECRET` remains server-side in Supabase and the protected GitHub manual fallback; the planned Cloudflare scheduler will hold the identical value only as an encrypted Worker secret. Schedulers post it only as `x-cron-secret` and never through `pg_net`.

The authorized disposable Test Store account proved the sequence: Auth deletion preceded RevenueCat processing, v1 DELETE `200` was recorded as requested, and a later v1 `404` was durably recorded as confirmed. A delayed, authenticated `RENEWAL` test event for the same confirmed tombstone was deliberately ledgered and ignored without any RevenueCat customer GET or billing upsert. The temporary function/runner used solely for that test were removed.

The retry function returns `503` rather than a false success if it cannot persist a claimed result. Expired five-minute leases are reclaimable by the queue RPC. GitHub automatic dispatch failed to produce any `schedule` events despite an active workflow and cron refresh, so GitHub is retained only for protected manual dispatch and its controlled failure-notification input. A Cloudflare Cron attempt later completed one healthy automatic event but failed to deliver a second event through four expected intervals; its Cron trigger is disabled. It must pass two automatic runs and a missed-run/alerting check before replacing the manual fallback.

Completed and failed queue records must not be purged until the owner and legal review approve a retention period and cleanup process. The minimal deletion tombstone remains necessary to prevent customer recreation after queue cleanup.

## Later real-store mapping

After each store app and subscriptions exist, connect it in RevenueCat, import/map real products to the unchanged entitlements and Current offering packages, add the platform public key to the matching EAS environment, run platform sandbox tests, and only then make a preview/production artifact. The app will reject absent, `test_`, or wrong-prefix platform keys before the build starts.

## Remaining tasks requiring Apple Developer or Google Play accounts

1. Create the iOS/Google Play store apps using the already-fixed bundle/package identifiers.
2. Create/import the existing Plus and Family product IDs; do not substitute invented IDs or prices.
3. Attach the real products to the unchanged entitlements and Current offering packages in RevenueCat.
4. Put only the matching public `appl_…` or `goog_…` SDK key in the matching EAS environment.
5. Perform StoreKit/Play Billing sandbox tests for purchase, cancellation, restore, expiry, billing issue, refund, and cross-device restoration.

This list excludes Test Store, Supabase secret configuration, and webhook deployment because those require RevenueCat/Supabase access but not Apple or Google accounts.
