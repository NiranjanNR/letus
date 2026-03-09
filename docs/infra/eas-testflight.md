# EAS Build + TestFlight

## What This Does

EAS (Expo Application Services) compiles the React Native app into a real iOS binary (.ipa)
and submits it to TestFlight so testers can install it on their iPhones without the App Store.

**Trigger:** Push to `main` branch with changes in `apps/mobile/**`

---

## Prerequisites (One-Time Setup)

### Apple Developer Account
- Active Apple Developer Program membership ($99/year)
- App identifier created: e.g., `com.letus.app`

### EAS CLI Setup (local machine)
```bash
npm install -g eas-cli
eas login          # Login with your Expo account
eas build:configure  # Creates eas.json if not exists
```

### Apple API Key (for automated submission)
1. App Store Connect → Users and Access → Keys → Generate New Key
2. Set role: App Manager or Admin
3. Download the .p8 file
4. Note the Key ID and Issuer ID

### GitHub Secrets Required

Set these in GitHub repo → Settings → Secrets:

| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | Expo access token (`eas token:create`) |
| `ASC_APP_ID` | App ID from App Store Connect |

---

## EAS Configuration (`apps/mobile/eas.json`)

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Release"
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "YOUR_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

---

## `app.json` Requirements

The following fields must be set before building:

```json
{
  "expo": {
    "name": "Letus",
    "slug": "letus",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.letus.app",
      "buildNumber": "1",
      "config": {
        "googleMapsApiKey": "AIza..."
      }
    }
  }
}
```

**Note:** `googleMapsApiKey` in `app.json` is required separately from `.env`.
See `docs/errors/log.md` ERR-009.

---

## GitHub Actions Workflow

**File:** `.github/workflows/eas-build.yml`

```yaml
# Triggers on push to main affecting apps/mobile/**
# Runs: eas build --platform ios --profile preview --non-interactive
# Then: eas submit (if configured)
```

Build takes approximately 10-15 minutes on EAS servers.

---

## Installing on TestFlight

1. Build completes → EAS emails "Your build is ready"
2. Log in to App Store Connect → TestFlight
3. Find the new build under the app
4. Add testers: Internal Testing (immediate) or External Testing (requires brief review)
5. Testers install TestFlight app from App Store, then accept invitation
6. Install the Letus build from TestFlight

---

## Manual Build (Without GitHub Actions)

```bash
cd apps/mobile
eas build --platform ios --profile preview
# Wait for build... (~10 min)
# Download link provided on completion
```

To submit manually:
```bash
eas submit --platform ios --profile production
```

---

## Common EAS Issues

| Problem | Fix |
|---------|-----|
| `EXPO_TOKEN` not set | Create token: `eas token:create` → add to GitHub secrets |
| "Bundle identifier already exists" | Set unique `ios.bundleIdentifier` in `app.json` |
| Build fails with "Missing Google Maps key" | Set `ios.config.googleMapsApiKey` in `app.json` |
| Build succeeds but map is grey | Same as above — `app.json` key missing |
| TestFlight shows "Processing" for hours | Normal — Apple processes the binary; wait up to 30 min |
