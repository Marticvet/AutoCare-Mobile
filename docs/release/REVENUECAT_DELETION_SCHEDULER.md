# RevenueCat deletion retry scheduler — Cloudflare activation checklist

Status: **not accepted for production scheduling.** Cloudflare Worker `autocare-revenuecat-deletion-retry` remains deployed to the Built Further account with zero active Cron Triggers. Its encrypted scheduler secret remains configured, and GitHub Actions remains the protected manual fallback. Cloudflare automatic scheduling was attempted on 2026-11-06, but was disabled after only one observed Cron invocation and no second invocation across four expected five-minute slots.

## Observed Cloudflare activation attempt — 2026-11-06

- GitHub Actions Run #7 (`workflow_dispatch`) succeeded after the secret rotation. Its automatic `schedule:` trigger was removed in commit `22e06c6`; manual dispatch, secret authentication, concurrency, and the controlled-failure test remain.
- Cloudflare version `5d2af1c3-1855-493a-a76d-a542bc15edcb` exposed one `*/5 * * * *` trigger and retained `ACCOUNT_DELETION_RETRY_SECRET` as an encrypted Secret.
- One genuine Cloudflare Cron event at `2026-11-06 14:25:09 CET` completed with `outcome: ok`, no exceptions, and the fixed success-only log. That proves one authenticated call received a healthy Supabase response without logging customer data or credentials.
- No second Cron event arrived through four subsequent expected slots. Cron was disabled in the existing Worker, producing version `2139f255-c53a-45b8-80c8-85905ccec65a`; no Worker, secret, Supabase function, customer, or RevenueCat record was recreated or changed.
- Aggregate queue health after the one successful event remains one `confirmed` request, zero stale actionable requests, and no due/failed work.
- Cloudflare Logs and Issues are enabled, but no designated-operator failure notification destination was verified. There is also no independent missed-run detector or durable heartbeat; Cloudflare error alerts alone cannot detect an invocation that never occurs.

Before another activation attempt, configure and verify an operator notification destination plus an independent five-minute/expected-run heartbeat monitor that alerts when no Cron success is observed. Do not call the scheduler production-ready until two automatic events and the missed-run alert have been observed.

GitHub Actions workflow `revenuecat-deletion-retries.yml` is active but its API recorded zero `schedule` events, including after the cron was moved away from minute zero. Do not use Supabase Cron with `pg_net`: its request queue can temporarily retain HTTP headers containing a shared secret.

## Minimal design

`workers/revenuecat-deletion-retry-scheduler/` has one Cron handler (`*/5 * * * *`, UTC). It performs one authenticated POST to the deployed `process-revenuecat-deletion-retries` endpoint with an encrypted Cloudflare `ACCOUNT_DELETION_RETRY_SECRET` binding. It has a 20-second timeout and fails the scheduled event for network errors, non-2xx statuses, invalid JSON, or an unhealthy queue response.

It contains no customer identifiers, RevenueCat key, queue storage, or retry logic. Supabase remains the sole queue owner and its atomic claim protects duplicate Cloudflare invocations. The HTTP handler returns `404`; it cannot start work. Cloudflare Observability and Issues are enabled, and the Worker logs only generic outcome/status information.

## Account and secret setup — owner action

1. In Cloudflare, use the intended account and enable Workers. Protect the account with owner-controlled MFA and recovery methods.
2. Authenticate Wrangler with the owner account (`npx wrangler login`) or create a narrowly scoped account API token for Workers deployment. Do not send a token to this repository or to support tickets.
3. Review `workers/revenuecat-deletion-retry-scheduler/wrangler.toml`: it declares only the public Supabase retry URL and the five-minute trigger.
4. Set `ACCOUNT_DELETION_RETRY_SECRET` as a Cloudflare Worker secret via the dashboard or interactive `npx wrangler secret put ACCOUNT_DELETION_RETRY_SECRET --config workers/revenuecat-deletion-retry-scheduler/wrangler.toml`. Paste the existing value directly into Cloudflare; do not print it, pass it on a command line, or provide it to an agent.
5. In Cloudflare Notifications, configure an owner email alert for Worker invocation errors/Issues. Confirm Observability is retained after deployment.

The endpoint URL is public configuration. The scheduler secret is the only required secret and must remain encrypted at rest in Cloudflare, Supabase, and GitHub Actions.

## Controlled deployment and acceptance — approval required

1. Run the focused local test, then deploy only this Worker with `npx wrangler deploy --config workers/revenuecat-deletion-retry-scheduler/wrangler.toml`.
2. Verify the Cron Trigger in Cloudflare is `*/5 * * * *` (UTC) and there is no public route that starts work.
3. Observe **two separate** Cloudflare scheduled events. Each must complete without error and the Supabase response must be healthy. Do not create a customer or invoke RevenueCat directly for this check.
4. Query only aggregate queue health: confirmed rows must not be claimed; no due, stale-processing, or failed rows may remain.
5. After both events pass, remove the `schedule:` trigger from the GitHub workflow while preserving `workflow_dispatch`, the protected secret header, concurrency, and controlled failure-notification test. Then confirm a manual GitHub run still works.

Do not add `set -x`, response-body logs, or debug logging. The Edge Function authenticates every request with `x-cron-secret`; requests without it receive `401`.

## Monitoring and recovery

The Supabase worker returns `503` when a request has failed, a durable outcome could not be recorded, or a queued/processing/requested entry exceeds the health threshold. The Cloudflare invocation must then fail and appear in Logs/Issues and the owner notification channel.

When an alert fires:

1. Inspect Cloudflare Logs/Issues and Supabase function logs without copying a secret or a customer identifier.
2. Inspect only queue status counts, error codes, and timestamps. Do not delete a queue row or tombstone to clear an alert.
3. Correct service availability/configuration, then use the protected GitHub manual workflow once if needed. A RevenueCat `200` is only requested; a later `404` is confirmation.
4. Escalate a `failed` request or age-threshold breach to the privacy/support owner.

## Secret rotation when the existing value is unavailable

Secrets cannot be read back from Supabase. If the existing value is unavailable, do not attempt to retrieve or log it. During an approved short maintenance window:

1. Create a new high-entropy value in the owner password manager.
2. Create the named Cloudflare Worker without a Cron trigger, store the new value as its encrypted secret, and update the GitHub Actions secret with the same value.
3. Update the Supabase `ACCOUNT_DELETION_RETRY_SECRET` last, then deploy the prepared Worker with its Cron trigger.
4. Perform the two-run acceptance before removing the GitHub automatic trigger. Update the GitHub secret before using manual fallback.

Queue rows remain durable during this window; no customer data or RevenueCat configuration is changed.

## Proposed retention — approval required

This is a proposed operating rule only; it does not configure a purge job or permit deletion of any queue record.

- Retain a confirmed queue record for 30 days after `confirmed_at`, then remove it only through an approved cleanup procedure.
- Retain a failed request only until the failure is resolved. An operator must review unresolved failures on the documented support/privacy-review cadence and record the outcome before removal.
- Retain only the minimal tombstone needed to prevent RevenueCat or a delayed webhook from recreating the customer. The owner and legal reviewer must approve its documented retention period and review mechanism before any tombstone cleanup is designed.

Until that approval exists, do not add automatic purging or silently retain errors indefinitely. Record the retention decision, the responsible operator, and the next review date in the release record.
