# AutoCare Hub — App Store submission package

Prepared 2026-11-05 from the local iOS configuration, application code, and existing release drafts. This is a submission-preparation checklist, not legal advice or StoreKit validation.

## 1. Apple App Privacy checklist

Use the table to complete App Store Connect. “Linked” means the data is associated with the account or app user ID. Confirm provider-side logging, retention, and the final feature set with the owner before submitting.

| Apple category | Data evidenced in app | Purpose | Linked | Tracking | Submission status |
| --- | --- | --- | --- | --- | --- |
| Contact Info | Email address; optional name, username, and phone number | Account creation, profile, account security, shared-garage invitations, support | Yes | No | Declare for **App Functionality** and **Account Management**. |
| User Content / Other User Content | Vehicle details, mileage, fuel/charging/service/insurance/general expenses, reminders, trips, budgets, checklists, reports, garage membership data | Core vehicle-recording, sync, sharing, export | Yes | No | Declare for **App Functionality**. Expense/cost entries are not payment-card or bank-account data. |
| Photos or Videos / Other User Content | Receipts and vehicle documents chosen for upload or camera capture | Document/receipt storage and display | Yes | No | Declare for **App Functionality** if uploads remain enabled. Confirm whether any document can contain sensitive identifiers before completing the form. |
| Location | Foreground location and optional saved expense coordinates; nearby-service search | User-requested nearby services or attaching location to an expense | Yes when saved to an account | No | Declare **Precise Location** for **App Functionality** if latitude/longitude remains stored. It is optional and not background collection. |
| Purchases | Subscription product, entitlement, renewal/expiration state; RevenueCat customer/app user identifier | Paid-feature access, restore purchases, support | Yes | No | Declare **Purchases** for **App Functionality**. Apple processes payment credentials; the app does not collect card details. |
| Identifiers | Supabase account UUID, authentication/session identifiers, RevenueCat app user ID | Authentication, synchronization, subscription entitlement | Yes | No | Declare **User ID** for **App Functionality**. |
| Diagnostics / Other Data | Potential provider-side IP/network and limited server-error logs mentioned in the policy | Security and reliability | **Confirm** | No known tracking | Confirm Supabase, PowerSync, RevenueCat, and hosting log collection/retention. Add the applicable **Diagnostics** and/or **Other Data** declaration only if the final service configuration collects it on the developer’s behalf. |

Do **not** declare advertising, cross-app tracking, contacts, health/fitness data, payment information, or profile images based on the current code evidence. There is no analytics, advertising, crash-reporting, Google/Apple social sign-in, or OCR SDK evidenced in the current dependency/configuration review.

### Third-party processing evidenced

- **Supabase:** authentication, database, storage, Edge Functions.
- **PowerSync:** synchronized local/offline application data.
- **RevenueCat and Apple:** subscription entitlement/purchase processing. Test Store validation is not App Store payment validation.
- **Google Maps/Places:** optional user-requested nearby-services/address features. Confirm the production key restrictions and Google data disclosures before release.
- **OCR:** feature is disabled by default; provider and processing details are **unresolved** and must be verified before enabling or describing it publicly.

## 2. Privacy, Terms, and Support draft review

The drafts correctly describe authenticated sync, optional foreground location, uploaded documents, subscriptions, Restore Purchases, export, and in-app deletion.

Required corrections/confirmations before publication:

1. Remove “profile image” from `PRIVACY_POLICY.md` unless that feature is intentionally added; it is not evidenced in the current profile flow.
2. Keep the OCR-provider placeholder unresolved until a provider, transmitted data, retention, and legal basis are approved. Do not enable the OCR flag first.
3. Replace the Family placeholder in `TERMS_OF_USE.md` with: **“Family supports up to six total members, including the owner.”** Confirm the final consumer wording with legal review.
4. Replace all legal-entity, contact, retention, region/transfer, age, governing-law, liability, and support placeholders. Publish approved HTTPS Privacy Policy, Terms, and Support pages before submission.
5. Confirm the policy’s statement about provider-side IP/network/error logs against the final hosted provider configurations.

## 3. English App Store metadata (draft)

- **App name:** AutoCare Hub
- **Subtitle:** Vehicle costs & reminders
- **Promotional text:** Track vehicle costs, maintenance and reminders in one organized hub. Keep your records available across your authorized devices.
- **Keywords:** vehicle,car,maintenance,expenses,fuel,service,reminders,mileage,garage,trip

### Description

AutoCare Hub helps you keep your vehicle records organized in one place.

Track vehicles, mileage, fuel, charging, service, insurance and other expenses. Set maintenance and renewal reminders, keep vehicle documents and receipts, and review your ownership costs over time.

Your records are saved locally first and synchronize to your authorized account when a connection is available. Optional nearby-services tools can use your location only when you choose to use them.

Free features support essential vehicle tracking. AutoCare Plus adds premium tools, while AutoCare Family lets you share an eligible garage with up to six total members, including the owner. Subscription availability, price and billing period are shown before purchase. Purchases are managed by the App Store, and Restore Purchases is available in the app.

Privacy, Terms and Support links are available in the Subscription screen.

### App Review notes (complete after Apple setup)

AutoCare Hub uses email/password accounts. Provide App Review with a dedicated demo account and test password through App Store Connect; do not put live credentials in this document. Explain any demo-data reset process.

The app requests camera/photo access only when the reviewer chooses to add a document or receipt, and foreground location only when choosing a nearby-service or location-attachment feature. Account deletion is available in Settings. The Subscription screen contains Restore Purchases and the legal/support links.

Before submitting, add the actual App Store subscription product IDs, reviewer steps to reach the paywall, and the approved Privacy/Terms/Support URLs. Do not describe RevenueCat Test Store as Apple sandbox validation.

## 4. iPhone screenshot checklist

Capture on a current iPhone size using sanitized demo data, with no email address, number plate, document, location, or personal expense visible.

1. Dashboard with a representative vehicle and summary cards.
2. Vehicles list and vehicle detail/edit screen.
3. Expense list and an expense-entry screen.
4. Reminder list and reminder-entry screen.
5. Documents/receipts screen, using a non-sensitive sample only.
6. Ownership/report view showing costs without personal data.
7. Subscription/paywall with actual App Store product text only after StoreKit configuration.
8. Subscription screen showing Restore Purchases and legal/support links after production URLs are configured.
9. Settings showing sync/account controls, without user data.

## 5. Manual App Store Connect work after enrollment

1. Create the app record for `com.marticvet.autocare`, add signing/App ID configuration, and set version/build metadata.
2. Add subscriptions and connect the production iOS RevenueCat public key; test through StoreKit sandbox/TestFlight.
3. Supply approved HTTPS Privacy Policy, Terms, Support, and marketing URLs in EAS production variables and App Store Connect.
4. Complete App Privacy declarations using section 1 after owner confirmation of provider logs and final enabled features.
5. Complete age rating, content rights, export-compliance, pricing/availability, review contact, demo account, screenshots, and review notes.
6. Perform physical-device acceptance for permissions, password reset deep link, account deletion, purchase, restore, and subscription management before submission.

## Unresolved owner confirmations

- Final legal entity, contact details, retention schedule, transfer safeguards, child-age threshold, jurisdiction, liability text, and support hours.
- Provider-side diagnostics/logging and retention for Supabase, PowerSync, RevenueCat, and hosting.
- Google Maps/Places production key restrictions and the appropriate provider disclosure.
- OCR provider/data processing, if the feature will ever be enabled.
- Final App Store subscription identifiers, prices, territories, trial terms, and App Review demo account.
