# Privacy and data-safety worksheet

Status: evidence worksheet, not a legal declaration. Reconcile against deployed services, SDK privacy manifests, configured analytics, support tooling, and final URLs before answering Apple App Privacy or Google Data safety questions.

| Data category | Observed app purpose | Destination/processor indicated by source | Linked to identity? | Tracking? | Evidence / decision still needed |
| --- | --- | --- | --- | --- | --- |
| Email, account ID, profile name/phone/avatar | authentication, profile, account recovery | Supabase Auth/Postgres/Storage | Yes | No observed ad tracking | Confirm Supabase region, retention, and support access. |
| Vehicle, expense, reminder, trip, document metadata | core tracking, reports, sync | local SQLite/PowerSync; Supabase Postgres | Yes | No observed ad tracking | Confirm retention/deletion and shared-garage access policy. |
| Document/receipt image/file | user-requested document storage/OCR | Supabase Storage; optional OCR Edge Function/Google Vision | Usually yes | No observed ad tracking | Confirm OCR is enabled in production and Google processing/retention. |
| Precise/coarse location | user-initiated nearby search or expense location | device; Google Places via Supabase Edge Function | Potentially if stored with an expense | No observed ad tracking | Confirm whether location is persisted for the selected feature and exact Maps/Places terms. |
| Purchase history, entitlement/account ID | subscription access and restore | RevenueCat; Supabase billing mirror; Apple/Google store | Yes | No observed ad tracking | Confirm RevenueCat configuration/webhook and store disclosure. |
| Diagnostics/usage | none intentionally implemented as analytics | no analytics SDK identified in dependency audit | Not established | No observed ad tracking | Confirm EAS/Expo, crash reporting, support, and server logs before declaring “none.” |
| Device/notification permission state | local reminder delivery | device/Expo Notifications | Not established | No observed ad tracking | Confirm no remote push token collection (current code uses local notifications only). |

## Verified technical statements

- The source sets `NSPrivacyTracking` false and does not include a dedicated advertising analytics SDK.
- The source uses Supabase, PowerSync, RevenueCat, Google Maps/Places, optional document OCR, and local notification APIs.
- The delete-account function deletes the authenticated user and owned storage objects; production retention/backups and legal deletion timelines need owner confirmation.
- Client code uses the Supabase anon key, never a service-role key; server secrets remain Edge Function configuration.

## Required final review

1. Obtain legal approval for purpose, retention, sharing, and deletion disclosures.
2. Review each shipped native SDK’s current Apple privacy manifest and Google Data safety disclosures at the exact locked version.
3. Test actual network traffic on a release candidate with OCR, Maps, billing, document upload, errors, and account deletion.
4. Answer Apple and Google forms from this evidence, not from this worksheet alone.
