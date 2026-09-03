# Password recovery setup

The mobile app requests password-reset emails with this exact callback:

`autocare://reset-password`

The iOS and Android projects already register the `autocare` URL scheme. The app accepts Supabase implicit-session fragments, PKCE codes, token hashes, and callback errors, then shows the in-app password form.

## Required Supabase dashboard settings

In **Authentication → URL Configuration**:

1. Add `autocare://reset-password` to **Redirect URLs**. Use the exact URL for production rather than a broad wildcard.
2. Replace `http://localhost:3000` in **Site URL** with the final HTTPS website URL before release. The Site URL is Supabase's fallback when a requested redirect is missing or rejected.

In **Authentication → Email Templates → Reset password**:

1. Keep the action linked to `{{ .ConfirmationURL }}` unless a web callback/OTP flow is deliberately implemented.
2. Do not hard-code `localhost`, `.SiteURL`, or an old app scheme into the reset button.

After changing the settings, request a fresh email. Recovery links are single-use; an old, already-opened, or expired link cannot be repaired.

## Test checklist

1. Use an installed development/preview build or standalone app, not Expo Go.
2. Request a reset from the new **Forgot password** screen.
3. Open only the newest email on the same mobile device.
4. Confirm AutoCare Hub opens directly on **Choose a new password**.
5. Set the password, then verify the new password works and the old one does not.
6. Repeat once with the app fully closed to validate cold-start link handling.

If a brand-new link is already marked `otp_expired`, inspect Supabase Auth logs for automated email-link prefetching. For production, mitigate this with an HTTPS intermediary page requiring a user tap or an email OTP/code flow instead of a link that consumes the token immediately.
