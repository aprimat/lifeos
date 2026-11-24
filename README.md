# LifeOS

A calm habit and goal app: set a goal, make a commitment, choose habits, follow the day, reflect and adjust.
Built with Expo (SDK 58) and React Native for iOS and Android. No backend yet; data is saved on the device.

- Product decisions: [`LifeOS_App_Plan.md`](LifeOS_App_Plan.md)
- MVP implementation plan: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- UI designs (Stitch): [`stitch_lifeos_habit_tracker_ios/`](stitch_lifeos_habit_tracker_ios/)
- Manual test script: [`docs/TEST_SCRIPT.md`](docs/TEST_SCRIPT.md) · Store listing draft: [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md)

## Run it

```bash
npm install
npm test            # unit + integration tests
npm run typecheck   # TypeScript
npm run web         # quick preview in a browser
npm run android     # development build on an Android emulator/device (needs Android SDK)
npm run ios         # development build on iOS (needs macOS + Xcode)
```

For quick local testing, LifeOS also runs in **Expo Go** (SDK 58) via `npx expo start` (Face ID
doesn't work in Expo Go on iOS). In the browser, biometrics and notifications are turned off.

To try the app with realistic history, open **Profile & settings → Load sample data** (dev and internal preview builds).

## iPhone build + over-the-air updates

The project is linked to EAS (`@aprimat-team/lifeos`) for over-the-air updates.

**Install on the iPhone (local build over the cable).** This builds in Release with Xcode, signed with
the paid Apple team's development profile (team `7DMHB3BMGW`, `com.aprimat.lifeos`), then installs and
launches the app on the connected iPhone:

```bash
npm run release:ios   # scripts/ios-release.sh: prebuild → pod install → xcodebuild → devicectl install
```

It needs Xcode signed in to the Apple ID (**Xcode → Settings → Accounts**), CocoaPods, and the iPhone
connected by cable, unlocked, with **Developer Mode** on. The first install may need **Settings → General →
VPN & Device Management → Trust**. Another iPhone: `LIFEOS_DEVICE=<UDID from xcrun xctrace list devices>`.
The build listens to the `preview` channel (`updates.requestHeaders` in app.json) and waits up to 5 s at
launch for a new update (`updates.fallbackToCacheTimeout`).

A cloud alternative (EAS Build, internal distribution, installed from a link) also exists:
`npm run device:add` once per iPhone, then `npm run build:ios`.

Without a build, the `preview` updates also open in **Expo Go**: publish with
`npm run update:expo-go -- "What changed"` and open
`exp://u.expo.dev/b5526673-8e1e-4783-a8bb-af130496c540?runtime-version=exposdk:58.0.0&channel-name=preview`.

**Every change after that** (JavaScript, styles, images):

```bash
npm run update:ios -- "What changed"
```

The installed app checks for updates on launch and when brought back to the foreground, downloads them
in the background, then asks **Update ready → Restart**. "Later" applies it on the next cold start.

`runtimeVersion` uses the `appVersion` policy: updates reach builds with the same `version` (currently
1.0.0). **Adding a native module, changing native config in app.json or upgrading the SDK needs a new
build** (`npm run release:ios`) — bump `version` first so older builds never receive incompatible code.

The preview EAS environment sets `EXPO_PUBLIC_DEV_TOOLS=1` (sample data, design gallery), and so does
`npm run release:ios` for the embedded bundle; the production environment (App Store builds) does not.

## Code map

```
src/
├── app/            Expo Router routes (thin files)
├── screens/        Screen bodies, grouped by area (today, goals, commitments, habits, progress, review…)
├── components/     Design-system components (Screen, Card, Button, controls, progress, sheet…)
├── domain/         Pure TypeScript: types, scheduling, analytics, rule-based suggestions (+ tests)
├── data/           Store (Zustand), actions (all writes), repository (storage), templates, sample data
├── services/       Local auth, session, notifications, biometrics, timer, export, haptics
├── hooks/          Theme, today's date, derived data
├── theme/          Design tokens from DESIGN.md (light + dark)
└── copy/           Shared user-facing wording and safety text
```

Key rules live in `src/domain/` with tests: planned rest never counts as missed, flexible weekly habits are
judged per week, edits never rewrite past days, and suggestions are only applied when the user accepts them.

## Swapping in a backend later

Screens never touch storage directly. `src/data/repository.ts` defines the `Repository` interface; replace
`LocalRepository` with an API-backed implementation, and replace the placeholder local authentication in
`src/services/auth.ts` with real server authentication.
