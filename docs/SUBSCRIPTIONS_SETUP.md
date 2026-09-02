# AutoCare memberships setup

The app implements the complete membership foundation:

- Free: one vehicle, expenses, one-off reminders, offline use, and cloud sync.
- Plus: unlimited vehicles, document/receipt storage, exports, advanced insights, and recurring reminders.
- Family: every Plus feature plus a shared garage, invitations, roles, and up to six people including the owner.
- Fleet: a shared business garage with licensed vehicle/member limits and Stripe-hosted web checkout.

RevenueCat is the purchase source of truth for Plus and Family. Stripe is the source of truth for Fleet. Supabase mirrors both and enforces limits and shared access with row-level security.

## Do these steps now

These are the only steps that require your RevenueCat or Supabase account.

### 1. Finish the RevenueCat Test Store catalog

In **Product catalog**:

1. Open **Entitlements** and create `plus_features` and `shared_garage`.
2. Open **Products** and create these Test Store subscriptions:

   | Product identifier | Duration | Test price |
   | --- | --- | --- |
   | `autocare_plus_monthly` | 1 month | €3.99 |
   | `autocare_plus_yearly` | 1 year | €34.99 |
   | `autocare_family_monthly` | 1 month | €6.99 |
   | `autocare_family_yearly` | 1 year | choose your annual discount |

3. Attach both Plus products to `plus_features`.
4. Attach both Family products to **both** `plus_features` and `shared_garage`.
5. Open **Offerings** and create or use offering `default`.
6. Mark it as the **Current** offering.
7. Keep the existing Plus monthly/yearly packages. Add two custom packages named `family_monthly` and `family_yearly`, mapped to the matching Family products.
8. In **Sandbox testing access**, allow your test users to receive sandbox entitlements.

The Test Store public key from your screenshot is already configured in the local untracked `.env`. Debug builds use it automatically. Release builds refuse Test Store keys.

### 2. Create one RevenueCat server key

Open **Project settings → API keys → Secret API keys**, create a key for the Supabase entitlement sync, and copy the `sk_...` value. This is a server secret: never put it in `.env` under an `EXPO_PUBLIC_` name.

### 3. Apply the database migrations

From the project directory, sign in/link once if needed, then push all pending migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
npx supabase db push
```

The push includes:

```text
supabase/migrations/20260826030000_billing_foundation.sql
supabase/migrations/20260831000000_billing_hardening.sql
supabase/migrations/20260901000000_membership_tiers.sql
```

The membership migration creates `garages`, `garage_memberships`, and `fleet_billing_accounts`, updates paid entitlements, installs role-aware RLS, and adds the new tables to the PowerSync publication.

### 4. Deploy the PowerSync configuration

In PowerSync Cloud, open the instance connected to this Supabase project, replace its Sync Streams configuration with `powersync/sync-config.yaml`, validate it, and deploy it. This is required before another driver can receive shared garage data offline.

### 5. Deploy the authenticated entitlement sync

Replace the placeholder with the RevenueCat secret key from step 2:

```bash
npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_REPLACE_ME
npx supabase functions deploy sync-entitlements
```

This is enough for the first end-to-end Test Store purchase test. The app calls this function after purchase, restore, sign-in, and refresh.

### 6. Build and test the app

RevenueCat purchases require a native development build; Expo Go is not supported.

```bash
npx expo run:ios
# or
npx expo run:android
```

Test in this order:

1. Sign in and create one vehicle. It must work on Free.
2. Try to create a second vehicle. The Plus screen must open.
3. Buy the monthly or yearly Test Store package.
4. Create the second vehicle, upload a document/receipt, export expenses, use advanced insights, and create a recurring reminder.
5. Open **Your plan**, refresh it, and verify `billing_customers` has your Supabase user UUID and `plus_features`.
6. Restore purchases and verify Plus returns.
7. Let a Test Store subscription expire. Existing data must remain readable/deletable while new paid-only writes are blocked.
8. Buy Family, open **More → Garage members**, invite a second signed-in test account, accept on that account, and switch to the shared garage.
9. Verify Driver can edit, Viewer cannot edit, Admin can manage invitations, and removing a member removes access.

## Fleet web and Stripe setup

The mobile app contains Fleet status and membership UI, and Supabase contains checkout/webhook functions. You still need a Stripe account and a small web page that calls `create-fleet-checkout`.

1. In Stripe, create recurring vehicle and optional member prices.
2. Set server-only Supabase secrets:

   ```bash
   npx supabase secrets set \
     STRIPE_SECRET_KEY='sk_test_...' \
     STRIPE_FLEET_VEHICLE_PRICE_ID='price_...' \
     STRIPE_FLEET_MEMBER_PRICE_ID='price_...' \
     FLEET_SUCCESS_URL='https://YOUR_WEB_APP/fleet/success' \
     FLEET_CANCEL_URL='https://YOUR_WEB_APP/fleet'
   ```

3. Deploy the two functions:

   ```bash
   npx supabase functions deploy create-fleet-checkout
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

4. Create a Stripe webhook for `checkout.session.completed` and `customer.subscription.*` at:

   ```text
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```

5. Copy its signing secret into Supabase:

   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET='whsec_...'
   ```

6. Publish the Fleet web page and put its URL in `EXPO_PUBLIC_FLEET_URL`.

## Add the webhook before production

RevenueCat webhooks currently require its Pro plan. The app can be developed with the authenticated sync above, but production should use the webhook so expiry, refunds, billing issues, and transfers update Supabase even when the app is closed.

1. Deploy the endpoint:

   ```bash
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   ```

2. In RevenueCat **Integrations → Webhooks**, create a webhook at:

   ```text
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook
   ```

3. Generate a long random value, enter `Bearer YOUR_RANDOM_VALUE` as the webhook Authorization header, enable HMAC signing, and copy the generated signing secret.
4. Store the exact same values in Supabase:

   ```bash
   npx supabase secrets set REVENUECAT_WEBHOOK_AUTHORIZATION='Bearer YOUR_RANDOM_VALUE'
   npx supabase secrets set REVENUECAT_WEBHOOK_SIGNING_SECRET='YOUR_REVENUECAT_HMAC_SECRET'
   ```

5. Send a sandbox test event from RevenueCat. Confirm one processed row appears in `billing_webhook_events`.

The endpoint verifies both Authorization and RevenueCat's timestamped HMAC signature, deduplicates event IDs, and re-fetches the customer instead of trusting entitlement fields from the event.

## Production store setup later

Only after Test Store acceptance passes:

1. Create the real subscriptions in App Store Connect and Google Play Console.
2. Connect both store apps to RevenueCat.
3. Import/map the real Plus and Family products to the same entitlements and Current offering packages used by the Test Store.
4. Configure `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` for release builds.
5. Configure real Terms, Privacy, and Support URLs.
6. Test purchase, restore, renewal, cancellation, grace/billing issue, refund, and account transfer in each platform sandbox before submission.

Never ship `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, never hardcode displayed prices, and never expose a RevenueCat secret key in the mobile bundle.
