# Production authentication email templates

Prepared: 2026-11-09. These templates are for the hosted Supabase project using the already-configured Resend SMTP sender `AutoCare Hub <no-reply@autocare.builtfurther.com>`. They make no DNS, SMTP, tracking, or Supabase configuration change.

## Template files and Dashboard subjects

| Supabase Email Templates entry | Subject | Local HTML |
| --- | --- | --- |
| Confirm signup | Confirm your AutoCare Hub email | `auth-email/templates/confirm-signup.html` |
| Reset password | Reset your AutoCare Hub password | `auth-email/templates/reset-password.html` |
| Change email address | Confirm your new AutoCare Hub email | `auth-email/templates/change-email.html` |
| Magic Link | Your AutoCare Hub sign-in link | `auth-email/templates/magic-link.html` |
| Invite user | You are invited to AutoCare Hub | `auth-email/templates/invite-user.html` |
| Reauthentication | Your AutoCare Hub verification code | `auth-email/templates/reauthentication.html` |

Each link-based file retains `{{ .ConfirmationURL }}` exactly. Do not replace it with a hand-built URL, `{{ .SiteURL }}`, a link shortener, or an email-tracking redirect. Reauthentication intentionally uses `{{ .Token }}` and has no link.

## Installation — owner action required

1. In Supabase Dashboard, open **Authentication → Email Templates**.
2. Select each entry above, set its subject, and paste the matching HTML file contents into the message body. Save one template at a time.
3. In **Authentication → URL Configuration**, keep `autocare://reset-password` and `autocare://auth/callback` as exact allowed redirect URLs. Do not use broad custom-scheme wildcards.
4. Before enabling **Confirm email**, send a fresh confirmation email to a disposable account and verify the callback on an installed build. The app passes `emailRedirectTo: "autocare://auth/callback"` for signup; password resets explicitly use `autocare://reset-password`.
5. Keep Resend click and open tracking disabled. Link rewriting can consume or break Supabase one-time links.

The templates deliberately use a text-only `AC` mark, one action per email, no external image, no analytics pixel, no URL shortener, no marketing copy, and no support or social links. This minimizes phishing signals and prevents external assets from creating tracking requests.

## Branded authentication-link options

The current `{{ .ConfirmationURL }}` normally starts on the Supabase Auth domain, then redirects to the app callback. Passing SPF, DKIM, DMARC, and TLS proves sender authentication, but does not itself solve Gmail phishing classification; placement must be measured by fresh provider delivery tests.

| Option | Result | Dependencies / cost |
| --- | --- | --- |
| Keep the Supabase Auth verification URL | Lowest operational risk; templates above work unchanged. | No new infrastructure. Link/domain mismatch can still affect user trust or filtering. |
| Supabase Custom Domain | Use a branded Auth/API hostname, so Supabase verification links can use your domain. | Paid Supabase add-on on a paid plan; domain ownership plus DNS/TLS validation; charges are hourly, so confirm current pricing in the dashboard before enabling. No DNS change was made. |
| HTTPS intermediary confirmation page | Email links point to a branded web page; a user tap then opens the preserved Supabase confirmation URL. This helps with security scanners/prefetching. | A maintained HTTPS page/hosting, redirect allow-list, monitoring, and a privacy/security review. The page must preserve the token unchanged and never log it. It is a product/infrastructure change, not enabled here. |
| Email OTP instead of link | Avoids link reputation and automated link prefetching. | App UI and server/client verification work using `{{ .Token }}`; a new recovery/confirmation flow and full provider acceptance are required. Not implemented here. |

Do not brand links through a generic URL shortener or a redirect/marketing product. Supabase documents that email tracking can rewrite and break authentication links, and that provider scanners can consume one-time links. Sources: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [custom domains](https://supabase.com/docs/guides/platform/custom-domains), and [custom-domain billing](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains).

## Deep-link audit

- `app.json` declares the `autocare` scheme; iOS `Info.plist` and Android manifest register it.
- Password recovery uses only `autocare://reset-password`; the parser accepts Supabase implicit-session fragments, PKCE `code`, and `token_hash`, then calls `setSession`, `exchangeCodeForSession`, or `verifyOtp({ type: "recovery" })`.
- Error query parameters, missing tokens, exchange/verification failures, and a reused code all route to the generic “link is invalid, expired, or already used” recovery screen. Raw provider error text is not displayed by that screen.
- Signup confirmation uses `autocare://auth/callback`, which is handled independently by the social/auth callback parser. Keep both URLs allow-listed.

This is source and automated-parser evidence. Real delivery/opening acceptance remains required on iOS and Android devices.
