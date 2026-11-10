# Authentication email acceptance plan

Run only after the owner installs the templates and, separately, authorizes the Supabase Dashboard changes. Use fresh disposable addresses and a standalone iOS/Android build; never record tokens, full headers, or real customer data in test evidence.

## Matrix

| Provider / client | Flows | Required evidence |
| --- | --- | --- |
| Gmail web and Gmail iOS/Android | Confirm signup, reset, invalid/reused reset | Inbox vs Spam classification, visible sender/domain, button destination starts with expected Auth/custom domain, app opens correct screen, generic expired/reused message. |
| Outlook.com and Microsoft 365 Outlook | Confirm signup, reset | Same as Gmail; repeat in an environment with Safe Links if used to detect prefetch consumption. |
| Apple Mail / iCloud | Confirm signup, reset | Rendering at small width, app handoff, one-time behavior. |
| Yahoo or Proton Mail | Reset | Render, sender trust indicators, button destination, app handoff. |
| Plain-text / image-disabled client | All installed link templates | Action remains visible and understandable; no content depends on external images. |

## Per-flow procedure

1. Confirm the From display is **AutoCare Hub** and the sender is `no-reply@autocare.builtfurther.com`; check that no click/open tracking redirect is present.
2. Send one fresh message. Check rendering at desktop and narrow mobile widths, heading hierarchy, readable contrast, keyboard navigation, and button target. Do not click a link in a security scanner or preview.
3. For signup, enable Confirm email only after verifying `autocare://auth/callback` is accepted and confirmation permits sign-in.
4. For recovery, use `autocare://reset-password`; set a new password, verify the old password fails, then reopen the same link and expect the generic invalid/expired/reused state.
5. Request a second recovery link, then test the first link and latest link according to the configured Supabase token policy. Record only pass/fail and timestamps.
6. For a forced-invalid URL, remove a token character or use a synthetic `error=access_denied`; the app must show the generic reset-link error without leaking a token or session.
7. For change-email, verify both expected recipient messages and that only the confirmed address can sign in. For Magic Link, Invite, and Reauthentication, run only if those flows are enabled in the app/admin process.

## Inbox-placement interpretation

Record SPF/DKIM/DMARC/TLS separately from spam placement. A provider can pass all authentication checks and still classify a newly branded sender or suspicious-link pattern as spam/phishing. Do not mark this work complete until fresh Gmail and Outlook delivery tests show the intended result.

## Exit criteria

- No tracking/rewrite URL, external image request, broken callback, or token exposure.
- Correct app destination for confirmed, expired, invalid, and reused recovery links on cold and warm launch.
- At least Gmail and Outlook pass rendering and delivery tests after template installation.
- Any Gmail phishing warning is retained as a release blocker with message headers and provider feedback handled by the domain/sending owner.
