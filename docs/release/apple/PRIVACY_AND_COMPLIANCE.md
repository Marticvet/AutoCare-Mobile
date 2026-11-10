# Privacy and compliance evidence

Official references reviewed 2026-11-09: https://developer.apple.com/app-store/review/guidelines/ ; https://developer.apple.com/support/offering-account-deletion-in-your-app/ ; https://docs.expo.dev/versions/v54.0.0/sdk/notifications/

Apple requires in-app account deletion for apps creating accounts, appropriate Apple payment handling, accurate metadata/screenshots, working review access and privacy disclosures. Deletion must explain ongoing Apple subscriptions. Local code includes native Apple auth, Google PKCE, explicit linking and deletion notice. None proves provider/signing configuration in the submitted build.

Reconcile ../store/PRIVACY_WORKSHEET.md with enabled features: email/name and user UUID, vehicle/expense/reminder records, uploaded documents, optional saved location, subscription history and processor diagnostics. Apple/Google identity providers are implemented; older worksheets saying otherwise are historical. OCR, Fleet and analytics are not approved for v1. Do not claim external OCR, profile photos or Supabase Free daily managed backups.

Owner/legal approval remains required for controller details, public HTTPS policies, processor regions/DPAs/transfers, lawful bases, retention and purge criteria. Confirmed queue retention of 30 days is proposed only; unresolved failures need review and minimal tombstones need an approved retention/review mechanism. No purge was implemented.

Native privacy manifest and permission strings exist, but audit the manifests in the actual signed archive, all SDK required-reason APIs, and App Store privacy questionnaire. No tracking implementation was identified; do not add ATT unless actual tracking is introduced. Answer encryption/export and age-rating questions from current Apple forms and actual features; do not infer answers from compilation. No legal compliance approval is implied.
