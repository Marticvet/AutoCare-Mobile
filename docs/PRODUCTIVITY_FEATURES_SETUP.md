# Productivity features: cloud setup and verification

This runbook completes the cloud side of CSV imports, EV charging, receipt OCR, budgets, trips, scheduled reports, fleet checklists, optional expense locations, notification actions, account export/delete, and sync diagnostics.

The mobile implementation is already in this repository. Supabase and PowerSync still need the matching deployment because neither service reads local source files automatically.

## Required deployment order

Use this order. Deploying the PowerSync stream before PostgreSQL contains the new tables and columns can produce schema-cache and missing-column errors.

### 1. Back up and migrate Supabase

Link the CLI to the same project used by `EXPO_PUBLIC_SUPABASE_URL`, then push every migration in filename order:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The final migration is `supabase/migrations/20260901030000_admin_access.sql`. The productivity migration before it adds expense location/import metadata, custom reminder delivery fields, EV charging, budgets, trips, report schedules, checklist templates/runs, indexes, RLS, and PowerSync publication entries. The final migration adds the trusted administrator flag, assigns it to `martigiant3@gmail.com`, and updates server-side paid-feature checks.

Do not paste `powersync/sync-config.yaml` into the Supabase SQL editor. It belongs in PowerSync Cloud.

### 2. Configure server-only secrets

Receipt OCR uses Google Cloud Vision. Scheduled reports use Resend. These are server secrets and must never use an `EXPO_PUBLIC_` name or be put in the app bundle.

```bash
npx supabase secrets set GOOGLE_CLOUD_VISION_API_KEY=REPLACE_WITH_SERVER_KEY
npx supabase secrets set RESEND_API_KEY=REPLACE_WITH_RESEND_KEY
npx supabase secrets set REPORT_FROM_EMAIL='AutoCare <reports@YOUR_VERIFIED_DOMAIN>'
npx supabase secrets set REPORT_CRON_SECRET=REPLACE_WITH_A_LONG_RANDOM_VALUE
```

Restrict the Google key to the Vision API and monitor its quota. Verify the sending domain/address in Resend before testing automatic delivery. Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.

### 3. Deploy the Edge Functions

```bash
npx supabase functions deploy receipt-ocr
npx supabase functions deploy send-scheduled-reports --no-verify-jwt
npx supabase functions deploy delete-account
```

`receipt-ocr` and `delete-account` require an authenticated app user. `send-scheduled-reports` is invoked by the database scheduler and authenticates with the private `x-cron-secret` header.

### 4. Schedule report delivery

In Supabase, enable the `pg_cron`, `pg_net`, and Vault extensions. Store the function URL and the same random cron secret in Vault:

```sql
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'autocare_project_url'
);

select vault.create_secret(
  'THE_SAME_REPORT_CRON_SECRET',
  'autocare_report_cron_secret'
);

select cron.schedule(
  'autocare-send-scheduled-reports',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'autocare_project_url'
    ) || '/functions/v1/send-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'autocare_report_cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
```

The worker processes up to 50 due schedules per run and advances each successful schedule. A failed email remains due so the next run can retry it.

### 5. Deploy PowerSync

After the Supabase migration succeeds, open the PowerSync project connected to that database, replace its Sync Streams definition with `powersync/sync-config.yaml`, validate it, and deploy it.

This step is required. The updated config streams charging expenses, budgets, trips, report schedules, checklist templates/items/runs, and existing shared-garage data. Supabase migration and PowerSync deployment solve different halves of synchronization; both must be current.

The administrator flag is queried directly from Supabase and is intentionally not stored in the PowerSync client database. Therefore, `20260901030000_admin_access.sql` does not require an additional PowerSync stream change beyond the productivity configuration already described above.

### 6. Configure expense map search

Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the development and release build environments. Enable Maps SDK for Android, Geocoding API, and Places API for address suggestions. Restrict the key to the app package/bundle and only the APIs the app uses. iOS map rendering uses Apple Maps by default, while the key powers address search and Android map rendering.

### 7. Rebuild and verify

Create a native development build rather than Expo Go:

```bash
npx expo run:ios
# or
npx expo run:android
```

Use a test account for this checklist:

1. Open Settings and wait until pending uploads are zero and the first sync has completed.
2. Add an EV charging record with kWh, battery percentages, charging speed, efficiency, and a current-location pin. Confirm it appears on another signed-in device.
3. Import a small Fuelio, Drivvo, or generic CSV. Import the same file again and confirm rows are recognized as duplicates.
4. Scan a receipt, review the suggested values, then save it. Deny an incorrect suggestion rather than silently accepting it.
5. Save a monthly budget and a manual business trip; check that ownership metrics and the vehicle history update.
6. Assign a checklist to a driver, fail one item, add damage notes, sign it, and confirm the run is marked “Attention required”.
7. Create a report schedule. For a quick test, set its `next_run_at` to the current time in Supabase and invoke the worker with the cron secret; confirm the attachment arrives.
8. Create a reminder a few minutes in the future. Test the app in foreground, background, and terminated states; verify Open and Mark complete actions.
9. Turn on airplane mode, create/edit records, restart the app, reconnect, tap Retry sync if needed, and confirm pending uploads return to zero.
10. Export account data. Test Delete account only with a disposable user because it removes the Auth user and all cascading records.

## Graceful degradation

- CSV import, EV records, budgets, trips, checklists, local reminders, and optional location capture do not depend on OCR or email providers.
- Without `GOOGLE_CLOUD_VISION_API_KEY`, receipt images can still be attached but field suggestions fail with a configuration message.
- Without Resend configuration, report schedules stay stored and due but cannot be emailed.
- Vehicle catalogue/VIN lookup remains hidden intentionally until a reliable European provider is selected.

## Security notes

- RLS is enabled on every new table, using the garage owner/membership authorization functions.
- OCR calls are authenticated and the Vision key remains server-side.
- The scheduled-report endpoint does not trust browser/app JWTs; it requires a separate random cron secret.
- Account deletion is authenticated and runs server-side with the service role only after identifying the requesting user.
