# Catholic Compass Mobile

Expo React Native app for Catholic Compass iOS/TestFlight builds.

## Development

```powershell
npm install
npm run start
```

## iOS builds

```powershell
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

The Expo project is owned by `potsofclay` and uses slug `catholic-compass`.

Before a production TestFlight build, replace `extra.apiBaseUrl` in `app.json` with the deployed HTTPS Catholic Compass API.
