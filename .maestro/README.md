# Maestro smoke checks

Install Maestro separately, create a disposable test user with at least one vehicle, and run:

```bash
TEST_EMAIL='test@example.com' TEST_PASSWORD='replace-me' maestro test .maestro/smoke-navigation.yaml
```

The flow is intentionally non-destructive. The complete offline/online CRUD and notification acceptance checklist is in `docs/PRODUCTIVITY_FEATURES_SETUP.md` because those checks require network toggling, a second device, and platform notification state changes.
