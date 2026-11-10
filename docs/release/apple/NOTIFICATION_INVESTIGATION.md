# Notification investigation — 2026-11-09

Local source: Expo SDK 54, expo-notifications 0.32.17. Real OS DATE requests already existed; reminders were not merely database records. Foreground banner/list/sound handler and native Expo plugin already exist.

Confirmed defects: every live-query change cancelled all requests before sequential recreation; overlapping asynchronous reconciliations were unprotected; returning from Settings did not refresh permissions/schedules; provider swallowed scheduling failures. These defects can lose or delay requests. They do not prove the cause of the reported November 9 missed delivery: no device pending-request snapshot, permission status, Focus/Scheduled Summary state, or native error log was available.

Changes: serialize form scheduling/cancellation and reconciliation; retain requests with matching content/date signatures; replace only changed identifiers; cancel removed/completed requests; reconcile on foreground return and clear reminders when no garage owner remains. Reject notification actions for IDs outside the active snapshot. Surface scheduling failures independently of permission denial.

Policy: dates are local wall time at scheduling. Lead minutes are subtracted. Past triggers are skipped, not fired unexpectedly. Recurrence advances when the user completes the reminder through existing repository logic; it is not an independent repeating OS alarm. A timezone change is reconciled on next app activation. While the app remains terminated, DATE requests retain their original absolute instant; travel-time wall-clock rebasing without launching is not implemented. DST follows the device Date implementation (nonexistent local times normalize forward); device DST/travel testing remains required. Mileage-only reminders have no OS date trigger.

Automated tests cover local date/lead time, unchanged snapshots, edit replacement, deletion, overdue/completed skips, permission recovery and native API failure recovery. Physical delivery is unverified. Inspect getPermissionsAsync (including iOS authorization and alert/sound settings), getAllScheduledNotificationsAsync, and getNextTriggerDateAsync in a development debugger with disposable reminder content only; do not retain emails, UUIDs or notification bodies in production logs.

Manual procedure: see IOS_ACCEPTANCE_TESTS.md. iOS Focus, Scheduled Summary, alert/sound settings and OS pending-notification capacity must be checked on the affected device before attributing the original miss to code.

References: https://docs.expo.dev/versions/v54.0.0/sdk/notifications/ and https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
