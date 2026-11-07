# Family-expiry security deployment plan

Status: deployed on 2026-11-05. Target: Supabase `zgevytforozvlxflbsup` and
PowerSync AutoCare EU instance `687f5520981243eff1a004e5`; active sync config
is v8 / `aafc`.

## Approved deployment payload

1. `supabase/migrations/20261105000000_family_expiry_access_safety.sql`
   replaces only `billing_can_admin_owner`, `billing_can_view_garage`, and
   `billing_can_view_membership`. It has no DML or destructive schema change.
   The transaction retains garages, vehicles, expenses, and membership history.
2. `powersync/sync-config.yaml` is a Sync Streams edition-3 draft accepted by
   the actual AutoCare EU validator with zero errors. It preserves each user's
   personal rows and admits Family-shared rows only when an active membership
   joins an active Family garage whose owner has `billing_customers.status =
   'active'` and a Family plan. The filter reads server-maintained replicated
   state only; it does not use client flags, custom PostgreSQL functions, or a
   clock predicate.

## Deployment evidence

1. Confirm `supabase migration list --linked` still matches through
   `20260908010000` and `supabase db push --linked --dry-run --skip-vault`
   contains exactly the approved migration.
2. The owner explicitly waived the backup requirement for disposable pre-release
   data; no plan upgrade or paid backup service was used.
3. Before activation, PowerSync Health was connected to
   `db.zgevytforozvlxflbsup.supabase.co` with v1 active; v8 / `aafc` is now
   active and v1 remains the configuration rollback target in version history.
4. Confirm no other Supabase migrations, PowerSync configuration edits, secrets,
   RevenueCat settings, or subscription records are in scope.

## Completed remote actions

1. Ran `supabase db push --linked --skip-vault`; only
   `20261105000000_family_expiry_access_safety.sql` applied and is recorded.
2. Deployed the validated AutoCare EU Sync Streams draft. Dashboard reports v8
   / `aafc` active, source connection healthy, and no issues.
3. `sync-entitlements`, webhook secrets, RevenueCat, products, and user records
   were not changed.

## Rollback

PowerSync: select the retained active v1 from version history and activate it;
verify Health and connected clients recover. Supabase: do not execute SQL in the
rollback-source directory directly. If a database rollback is necessary, first
confirm the live post-deployment function bodies, create a new timestamped
migration from `supabase/rollback/20261105000000_family_expiry_access_safety.rollback.sql`, and obtain separate approval. That rollback intentionally
restores the pre-fix metadata exposure and is therefore an emergency measure.

## Acceptance after deployment

- Active Family owner/member: shared garage metadata, authorized shared rows,
  six seats, and permitted administration work.
- Expired Family member: direct REST/RPC reads and invitations/membership
  management are denied; PowerSync stops replicating shared rows after the
  authoritative billing mirror refreshes; owner rows/history remain intact.
- Renewed Family: active mirror state restores permitted access without creating
  memberships, garages, or duplicate owner records.
- Offline caveat: a device that stays offline can retain its previously synced
  SQLite copy until it receives the entitlement/billing update and syncs. The
  server still rejects unauthorized reads/writes immediately via RLS/RPC.
- Test upload queue behavior for a member whose access expires while offline;
  rejected writes must remain failed/retryable and must not be applied under a
  different user session.

CoreSimulatorService is currently unavailable, and no existing active Family
owner/member session can be used without an additional Test Store purchase or
new account. These device/RLS lifecycle tests remain pending rather than being
simulated by direct billing-table changes.
