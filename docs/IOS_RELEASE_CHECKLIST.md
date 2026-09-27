# iOS Release Checklist

## Current Expo/GitHub status

- Expo project: `potsofclay/catholic-compass`
- GitHub repository: `mrdevoid-sys/catholic-compass`
- Expo GitHub base directory: `/apps/mobile`
- iOS bundle identifier: `app.catholiccompass.pilgrim`
- Distribution type: App Store
- Saved Apple distribution certificate is available in Expo.

## Current blocker

Expo does not yet have an App Store provisioning profile for:

```text
app.catholiccompass.pilgrim
```

Do not select provisioning profiles for other bundle identifiers, including:

```text
com.potsofclay.workspace
com.potsofclay.restexpress
com.adoreprayerapp.adore
com.adore.prayerapp
```

Those profiles do not match Catholic Compass and should not be used for this app.

## Required Apple step

Create or let EAS create an App Store provisioning profile for:

```text
app.catholiccompass.pilgrim
```

The easiest path is usually to run an interactive EAS build and allow EAS to manage Apple credentials after signing in with the Apple Developer Program account:

```powershell
cd "C:\Users\ddevo\Downloads\CatholicCompass (1)\CatholicCompass\apps\mobile"
npx eas-cli login
npx eas-cli build --platform ios --profile preview
```

When prompted, sign in with the Apple Developer account and allow EAS to create/manage missing credentials.

## After credentials exist

Start a GitHub build from Expo:

1. Open Expo Builds for `potsofclay/catholic-compass`.
2. Click **Build from GitHub**.
3. Confirm base directory is `/apps/mobile`.
4. Choose **iOS**.
5. Use build profile `preview` for internal testing or `production` for App Store/TestFlight.
6. Leave EAS Submit off until the App Store Connect app record exists.

## Before TestFlight submission

- Replace the placeholder `extra.apiBaseUrl` in `apps/mobile/app.json` with the production HTTPS Catholic Compass API.
- Create the App Store Connect app record.
- Add privacy policy and support URLs.
- Prepare real app screenshots.
- Fill Apple app privacy answers according to actual app behavior.
- Add an App Store Connect API key or configure submit credentials if automated submission is desired.
