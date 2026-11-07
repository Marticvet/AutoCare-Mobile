# Built Further legal/support publication requirements

No existing deployable Privacy Policy, Terms of Use, or Support page was found in this repository. The companion Markdown pages are prepared for the Built Further website but are **not publishable until the owner approves and supplies**:

1. Legal entity name, registration details, physical address, country, and governing law.
2. Monitored support and privacy contact emails, support hours, and optional status-page URL.
3. Data controller/DPO or representative details, legal bases, retention periods (including backups), provider regions, and transfer safeguards.
4. Minimum user age and child-data policy.
5. Final plan prices, family eligibility/member limit, refund wording, and liability/consumer-dispute language after legal review.
6. Confirmation whether optional OCR, scheduled reports, and fleet billing are enabled at launch, and their providers/data flows.

After approval, publish stable HTTPS URLs and configure `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, and `EXPO_PUBLIC_SUPPORT_URL` in the matching EAS environments. Verify each opens from a signed release build.
