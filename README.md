# AutoCare Hub Mobile

Offline-first vehicle management for individuals and small fleets. The Expo React Native app tracks vehicles, fuel, service, insurance, everyday expenses, replaced parts, date/mileage reminders, vehicle documents, nearby services, and reports in English, German, Bulgarian, Spanish, and French.

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
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POWERSYNC_URL=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Nearby search is the only core screen that needs the Google key and live connectivity.

## Cloud migration

Before using reminders, documents, general expenses, or service parts across devices:

1. Apply all SQL files in `supabase/migrations` in filename order.
2. Validate and deploy `powersync/sync-config.yaml` in PowerSync Cloud.
3. Follow `docs/OFFLINE_ONLINE_SETUP.md` for storage, security, and the online/offline acceptance check.

## Quality checks

```bash
npm run typecheck
npm test -- --runInBand
npm run lint
```

The calculation tests cover due-state logic, fuel economy, totals, date validation, and CSV escaping.
