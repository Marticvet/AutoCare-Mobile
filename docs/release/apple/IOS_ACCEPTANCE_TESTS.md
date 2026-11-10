# iOS release acceptance matrix

No new device, backend, StoreKit or two-user acceptance was performed in this preparation. Earlier evidence remains in ../TEST_REPORT.md; it is not evidence for this changed binary.

| Area | Required acceptance | Current evidence |
|---|---|---|
| Auth | Email confirm, Google, Apple/relay, cancel, explicit link preserving UUID/data, reset/expired link, restart, logout/account switch | Existing focused automated tests; owner reports initial device social-auth pass; new release binary unverified |
| Records | Vehicle and all expense CRUD; invalid/empty/error states; reports/export | Source reviewed; authenticated device pass required |
| Offline | Create/edit/delete, terminate offline, relaunch, reconnect, no duplicates; competing writes | Existing connector/session tests; two-device conflict acceptance required |
| Family | Owner/member, six total seats, denied seventh, revocation/expiry, cache removal, cross-account isolation | Existing expiry/guard tests; live two-account acceptance required |
| Documents | Upload/open/delete, permission denial, owner-only storage access | Live non-production acceptance required |
| Notifications | Procedure below | New mocked regression tests; physical delivery unverified |
| Billing | Four real Apple products; purchase/interruption/restore/renew/cancel/expire/refund; switch accounts | Test Store evidence only; Apple sandbox blocked by setup |
| Deletion | Empty and populated account; partial failure; local cleanup; delayed webhook | Existing backend acceptance and local tests; owned-data cascade deployment and device acceptance require confirmation |
| Quality | VoiceOver, Dynamic Type, keyboard, small/large screens, safe areas, camera/photo/location, crash/performance | Manual device validation required |

## Two-minute notification procedure

Use an owner-approved disposable account on the signed candidate, automatic device date/time, notifications allowed with banners/sound, Focus and Summary disabled. Save a dated reminder two minutes ahead; confirm exactly one matching OS pending request and its next trigger in the development debugger. Repeat independently with app open, backgrounded, terminated, offline, and restarted before delivery. Record OS/build, timezone, pending count, intended/delivered time and sanitized result. A successful schedule API response alone is not delivery evidence.

Edit the time to four minutes ahead: one identifier must remain, with no alert at the original time. Delete: identifier absent and no delivery. Deny permission: reminder saves with explanation; enable in Settings and return: request appears without editing. Repeated sync must preserve one request. Complete a recurring reminder: only the next dated occurrence schedules. Test DST gap/fold and timezone travel, recording the policy in NOTIFICATION_INVESTIGATION.md. Check logout/account switch removes private pending alerts and stale actions cannot edit another account.

Backend security acceptance requires an explicitly approved non-production project plus two disposable users. Run CRUD and Storage/RPC requests as both users, including guesses at the other's IDs; verify denial and Family-specific permissions. No credentials or demo user creation was authorized in this task.
