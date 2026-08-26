# AutoCare offline/online setup

The mobile app reads and writes the PowerSync-managed SQLite database. A write is immediately available on the device and remains in PowerSync's CRUD queue until Supabase accepts it.

## Required cloud steps

1. Back up the Supabase project.
2. Apply these migrations in order with the Supabase CLI or SQL editor:
   - `supabase/migrations/20260825000000_autocare_tracking.sql`
   - `supabase/migrations/20260825010000_supabase_sync_reliability.sql`
   - `supabase/migrations/20260825020000_vehicle_catalog.sql`
   - `supabase/migrations/20260826000000_schema_security_hotfix.sql`
3. In the PowerSync dashboard, validate and deploy `powersync/sync-config.yaml` as a Sync Streams configuration. The YAML is deployed in PowerSync, not executed in the Supabase SQL editor.
4. Confirm the `powersync` Postgres publication contains all nine user-data tables. The migration adds the four new tables when that publication exists.
5. Confirm Supabase Auth is enabled for the PowerSync instance.
6. Build a development client after native dependency or permission changes.

If the earlier three migrations were already applied, run only the final hotfix. It adds the columns expected by the current app (including `vehicles.vehicle_trim`, `vehicles.vehicle_fuel_type`, and `profiles.phone_country_code`), restores owner-only row-level security policies, updates the PowerSync publication, and asks PostgREST to reload its schema cache. The schema-cache error shown in the app cannot disappear until this SQL has been run against the same Supabase project configured by `EXPO_PUBLIC_SUPABASE_URL`.

PowerSync currently recommends Sync Streams with `auto_subscribe: true` for an offline-first user dataset. See the [official Supabase guide](https://docs.powersync.com/integrations/supabase/guide) and [Sync Streams documentation](https://docs.powersync.com/sync/streams/overview).

## Environment

Keep these values in `.env`; do not commit the file:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POWERSYNC_URL=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

The Google key is only needed for nearby fuel stations and workshops. Restrict it to the iOS bundle ID and Android package/signing certificate in Google Cloud. Core tracking works without it.

The optional make/model/trim catalogue needs an internet connection. The vehicle form always includes a manual-entry mode, so adding and editing vehicles still works offline.

## Document files

The migration creates a private `vehicle-documents` bucket with a 20 MB file limit. Metadata is saved offline first. Files are copied into the app's document directory and uploaded when connectivity returns. Another device can open a file through a short-lived signed URL after its metadata has synchronized.

## Manual acceptance check

1. Sign in online and wait for the sync banner to disappear.
2. Enable airplane mode and force-close/reopen the app.
3. Verify vehicles, expenses, reminders, and document metadata still load.
4. Add one record of each type while offline and export a CSV report.
5. Disable airplane mode and verify the banner moves through syncing to up to date.
6. Confirm the new rows in Supabase and on a second signed-in device.
7. Edit the same non-critical record on two devices to confirm the expected last-write-wins behavior.
8. Verify a rejected RLS write remains queued and surfaces a sync error instead of disappearing.

## Provider-dependent future work

Subscription billing, workshop booking, background real-time GPS fleet tracking, push delivery, and ML maintenance prediction require provider selection, commercial rules, consent flows, and platform credentials. The current data model and navigation do not pretend those integrations exist.
