# RevenueCat deletion retry scheduler

This Cloudflare Worker is the planned production scheduler for the already-deployed Supabase `process-revenuecat-deletion-retries` Edge Function. It contains no customer identity, queue state, or RevenueCat credential. Supabase remains the only queue owner and atomically claims work.

## Behaviour

- Cloudflare Cron invokes `scheduled()` every five minutes (UTC).
- The Worker sends one POST to `SUPABASE_RETRY_FUNCTION_URL`, with `x-cron-secret` populated only from the encrypted `ACCOUNT_DELETION_RETRY_SECRET` binding.
- It uses a 20-second request timeout and fails its scheduled invocation on a network error, non-2xx response, invalid JSON, or `health.needsAttention` response.
- It logs only generic outcomes and HTTP status; it never logs secrets, response content, account identifiers, or customer data.
- Its public fetch handler always returns `404`; it cannot trigger the retry job.

## Local checks

```sh
npm test -- --runInBand --watchman=false workers/revenuecat-deletion-retry-scheduler/src/__tests__/index.test.ts
npx wrangler dev --config workers/revenuecat-deletion-retry-scheduler/wrangler.toml --test-scheduled
```

For the second command, put non-production values in a local-only `.dev.vars` file in this directory. Do not commit that file or place production secrets in shell history.

## Controlled deployment

Do not deploy until the Cloudflare account, encrypted secret, endpoint value, and operator notification rule are confirmed. See `docs/release/REVENUECAT_DELETION_SCHEDULER.md` for the ordered deployment, two-run acceptance, GitHub-cron removal, rotation, and rollback procedure.
