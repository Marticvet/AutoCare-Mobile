# Approval-gated pre-release cleanup

No deletion has been performed. This is the bounded preview and runbook for the existing project `zgevytforozvlxflbsup`; it is labelled **production** in the Supabase CLI, so use only after explicit owner approval.

## Known disposable scope created on 2026-11-04

| Marker | Created resources | Notes |
| --- | --- | --- |
| `autocare-release-preflight-20261104-afcbe3d3-a@example.invalid` | Auth user, profile, one vehicle, one reminder | Account A RLS/CRUD case. |
| `autocare-release-preflight-20261104-afcbe3d3-b@example.invalid` | Auth user, profile | Account B isolation case. |
| `autocare-release-powersync-20261104-c@example.invalid` | Auth user, profile, one vehicle, RevenueCat Test Store sandbox customer | Debug/PowerSync/Test Store case. RevenueCat Sandbox data shows completed Plus Monthly and Family Yearly simulated purchases; do not delete until any approved follow-up expiry/mirror investigation is complete. |
| `autocare-rc-teststore-20261104-plus-yearly@example.invalid` | Auth user, profile, personal garage, RevenueCat Test Store sandbox customer, paid `billing_customers` mirror | Separate Plus Yearly Test Store account, UUID `aba76351-23ba-4653-b9e1-0eb3f3ad0e2a`. Its Test Store purchase and active `plus_yearly` mirror include only `plus_features`; its earlier direct Family-invite RPC was correctly denied. |
| `autocare-rc-teststore-20261104-family-monthly@example.invalid` | Auth user, profile, Family garage, RevenueCat Test Store sandbox customer, paid `billing_customers` mirror, one retained vehicle | Separate Family Monthly Test Store account, UUID `88084c61-c696-4cef-90e6-97384e28e6dc`. Its Test Store purchase and active `family_monthly` mirror include `plus_features` and `shared_garage`; the billing trigger set the garage to Family with six seats. The 2026-11-05 Debug persistence marker is vehicle `Offline Acceptance` / plate `OFFLINE-2026` / 12,345 km; it must remain until offline/relaunch acceptance is explicitly closed. |

No Storage object was created: the only attempted free-tier upload was denied by RLS. No new disposable account or customer was created during webhook verification, offline recovery, or the 2026-11-05 Family-expiry deployment. The authorized webhook produced retained ledger rows for controlled synthetic and genuine Test Store Renewal/Expiration deliveries; those rows must remain for audit. The Android Pixel 8 API 35 Debug installation reached only the sign-in screen; it created no account, session, or test rows. The Family-expiry migration and validated PowerSync v8 draft were deployed, but no owner/member authorization test data was changed. The first three accounts include existing Test Store evidence as described above; the two `autocare-rc-teststore-…` accounts were created solely for alternative-plan acceptance and must remain intact until offline acceptance and Family-expiry lifecycle work either completes or is explicitly abandoned.

## Required preview before approval

An owner with service-role/SQL access must export counts and identifiers only for the five exact emails above, then reconcile all user-owned rows by their resolved auth UUIDs. Include: `profiles`, vehicles, fuel/insurance/service/general/charging expenses, reminders, trips, documents, service parts, budgets, reports, checklists, garages/memberships/fleet billing accounts, `billing_customers`, and `billing_webhook_events`; list `vehicle-documents/<uuid>/` objects separately. Do not use a broad email/domain/prefix delete.

Also export the matching RevenueCat Test Store customer IDs before deletion. Preserve the single sandbox/Test Store webhook configuration until its authorized-delivery investigation is closed; it is configuration, not customer data, and must not be removed as part of account cleanup. PowerSync client state is local to the simulator/device and is cleared by sign-out or uninstall; do not alter server replication/publication configuration.

## Execution after explicit approval

1. Re-run the exact preview and compare it to the approved export; stop on any non-matching identity or unexpected external customer.
2. Remove user-owned Storage paths for only the approved UUIDs, then delete only the corresponding Auth users through the authenticated `delete-account` function or Supabase Auth admin API. Auth-user cascades remove owned relational data and `billing_customers`; verify actual foreign-key behavior from the preview rather than assuming it.
3. Delete only webhook ledger rows whose resolved `app_user_id`/event metadata belongs to the approved test customers. Do not purge the entire ledger.
4. Delete the matching RevenueCat **Test Store** customers in the RevenueCat dashboard if retained, never a production customer.
5. Verify zero Auth users for the five exact emails, zero rows in every scoped table, zero approved Storage objects, no matching RevenueCat test customers, and a fresh simulator sign-in has no cached PowerSync rows.

Schemas, migrations, RLS policies, Storage bucket configuration, Edge Functions, secrets, publication configuration, and non-test data are explicitly out of scope.
