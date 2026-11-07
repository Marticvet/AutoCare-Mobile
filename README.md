# AutoCare Hub Mobile

Offline-first vehicle management for individuals and small fleets. The Expo React Native app tracks vehicles, fuel, EV charging, service, insurance, everyday expenses, optional locations, trips, ownership costs, reminders, documents, inspections, imports, and reports in English, German, Bulgarian, Spanish, and French.

## Architecture

- React Native + Expo for iOS and Android
- Supabase Auth and PostgreSQL for cloud identity and persistence
- PowerSync + SQLite for instant local reads/writes and queued synchronization
- Typed React Navigation and a shared native design system
- Private Supabase Storage for vehicle documents

The app never waits for a first network sync before showing cached authenticated data. Stored-data screens read SQLite, so normal tracking remains available offline.

## Start development

```bash
npm install
npx expo run:ios
# or
npx expo run:android
```

This project uses native PowerSync/SQLite modules and should be tested with a development build, not Expo Go.

Create a private `.env` containing:

```text
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POWERSYNC_URL=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_PRIVACY_URL=
EXPO_PUBLIC_TERMS_URL=
EXPO_PUBLIC_SUPPORT_URL=
```

Start from `.env.example`. The RevenueCat Test Store key is for a development
client only. `npm run ios:release:simulator` creates a non-distributable local
Release simulator build with all RevenueCat keys removed; `npx expo run:ios
--configuration Release` receives the same automatic protection when `.env`
uses `EXPO_PUBLIC_APP_ENV=development`. EAS preview and production profiles
clear the Test Store key and require the matching platform public key. Do not
use a local Release artifact as a store candidate—use the guarded EAS
production profile after its real keys and legal URLs are configured.

Nearby search is the only core screen that needs the Google key and live connectivity.

## Cloud migration

Before using the complete cloud-backed feature set across devices:

1. Apply all SQL files in `supabase/migrations` in filename order.
2. Validate and deploy `powersync/sync-config.yaml` in PowerSync Cloud.
3. Follow `docs/PRODUCTIVITY_FEATURES_SETUP.md` for Edge Function secrets, report scheduling, and the required verification checks.
4. Follow `docs/OFFLINE_ONLINE_SETUP.md` for storage, security, and the online/offline acceptance check.

For Free, Plus, Family, and Fleet memberships, follow `docs/SUBSCRIPTIONS_SETUP.md` to configure RevenueCat Test Store, shared garages, and the Stripe Fleet boundary.

## Quality checks

```bash
npm run typecheck
npm test -- --runInBand --watchman=false
npm run lint
npm run release:check
npm run ios:release:simulator
```

`release:check` validates release configuration, types, tests, and lint. Run
`npm run release:doctor` in the supported Node 20/22 environment before a
release build. See `docs/release/` for the store handoff.

The calculation and importer tests cover due-state logic, fuel economy, totals, date validation, CSV escaping, quoted delimiters, localized numbers, Fuelio/Drivvo-style mapping, EV charging imports, and rejected rows. Optional Maestro smoke flows live in `.maestro`.
