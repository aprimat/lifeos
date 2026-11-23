# LifeOS

A calm habit and goal app: set a goal, make a commitment, choose habits, follow the day, reflect and adjust.
Built with Expo (SDK 58) and React Native for iOS and Android. No backend yet; data is saved on the device.

- Product decisions: [`LifeOS_App_Plan.md`](LifeOS_App_Plan.md)
- MVP implementation plan: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- UI designs (Stitch): [`stitch_lifeos_habit_tracker_ios/`](stitch_lifeos_habit_tracker_ios/)

## Run it

```bash
npm install
npm test            # unit + integration tests
npm run typecheck   # TypeScript
npm run web         # quick preview in a browser
npm run android     # development build on an Android emulator/device (needs Android SDK)
npm run ios         # development build on iOS (needs macOS + Xcode)
```

LifeOS uses native modules (biometric lock, notifications, secure storage), so on phones it runs as a
**development build**, not in Expo Go. In the browser, biometrics and notifications are turned off.

To try the app with realistic history, open **Profile & settings → Load sample data** (development builds only).

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
