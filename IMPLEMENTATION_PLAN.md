# LifeOS — MVP Implementation Plan

**Status:** MVP implemented on branch `feature/mvp` (see §8 for differences from this plan)
**Version:** 1.0
**Last updated:** November 22, 2026
**Inputs:** `LifeOS_App_Plan.md` (v1.3, the source of truth for product decisions) and the Stitch screens in `stitch_lifeos_habit_tracker_ios/`, including `lifeos_quiet_systematic/DESIGN.md`.

---

## 0. Decisions this plan is built on

| Topic | Decision |
|---|---|
| Product name | **LifeOS** |
| Platform | React Native with **Expo SDK 58** (latest stable today) on iOS and Android, using TypeScript and Expo Router |
| Backend | None yet. Data is **saved on the device** in SQLite behind a repository layer, so a future API can replace it without changing the screens |
| Accounts | Required before the first habit. Email, password and name are checked locally on the device for now |
| Paid features | None. Everything is free |
| Screen variants | Merged (see §3) |
| Extras in MVP | Real local reminders with quiet hours, dark mode, habit timer, biometric lock |
| Plan vs. screens | Layout follows Stitch. **Product rules and wording follow `LifeOS_App_Plan.md`** (see §3.3) |

### Development builds
Biometric unlock (Face ID can't be tested in Expo Go on iOS) and reliable notifications need a **development build** (`expo-dev-client`). Expo Go is fine for the first steps. We switch to dev builds in Step 2.3.

---

## 1. Technical architecture

### 1.1 Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 58, React Native, TypeScript (strict) | One codebase for iOS and Android |
| Navigation | Expo Router (file-based), with tabs and stacks | Today / Goals / Progress tabs, plus modal flows |
| Local database | `expo-sqlite` with **Drizzle ORM** and migrations | Structured, queryable history (logs grow every day). The schema maps easily to a future server database |
| Data access | Repository interfaces used through **TanStack Query** hooks | Screens never touch SQLite directly. A future `ApiRepository` replaces `SqliteRepository` |
| UI state | Zustand for short-lived UI state only (wizard drafts, timer) | Persistent data stays in SQLite |
| Forms & validation | `react-hook-form` and `zod` | Shared schemas for wizard steps |
| Secure storage | `expo-secure-store` | Session token and lock preference |
| Password hashing | `expo-crypto` (salted SHA-256, local only) | Placeholder until a backend handles real authentication |
| Biometric lock | `expo-local-authentication` | |
| Notifications | `expo-notifications` (local, scheduled) | Reminders, quiet hours, timer end |
| Dates | `date-fns` | Local-date calculations; weeks start on Monday |
| Charts & rings | `react-native-svg` (custom components) | Keeps the calm look from DESIGN.md |
| Motion | `react-native-reanimated` and `expo-haptics` | Subtle check animations and a 100 ms haptic tap; respects Reduced Motion |
| Fonts | `@expo-google-fonts/inter` | DESIGN.md uses Inter. Numbers use tabular figures (`tnum`) |
| Export | `expo-file-system` and `expo-sharing` | JSON and CSV export |
| Tests | `jest-expo` and React Native Testing Library | The analytics and scheduling engine is pure code, written test-first |
| Lint & format | ESLint (expo config) and Prettier | |

Install every package with `npx expo install <pkg>` so versions match SDK 58.

### 1.2 Folder layout

```
lifeos/
├── app.json · eas.json · package.json · tsconfig.json · drizzle.config.ts
├── assets/                     # icon, splash, calm imagery, fonts
└── src/
    ├── app/                    # Expo Router routes ONLY
    │   ├── _layout.tsx         # providers, fonts, theme, auth and lock gate
    │   ├── (auth)/             # welcome, sign-in, sign-up
    │   ├── (onboarding)/       # areas, choose-path
    │   ├── (tabs)/             # today, goals, progress
    │   ├── goal/ [id].tsx · new/…          # goal wizard (direction → my-why → next step)
    │   ├── commitment/ [id].tsx · new/… · [id]/complete.tsx
    │   ├── habit/ [id].tsx · [id]/progress.tsx · new/…   # build/reduce → schedule
    │   ├── check-in.tsx · reflection/[logId].tsx · weekly-review/[week].tsx
    │   └── settings/ …
    ├── screens/                # screen bodies and their private components
    ├── components/             # design-system components (§4)
    ├── domain/                 # types, schedule engine, analytics, suggestions (pure TS, tested)
    ├── data/
    │   ├── db/                 # Drizzle schema, migrations, client
    │   ├── repositories/       # interfaces and sqlite implementations
    │   └── templates/          # starter template definitions (static data)
    ├── services/               # auth, session, notifications, biometrics, export, timer
    ├── hooks/                  # TanStack Query hooks (useToday, useGoal…), useTheme
    ├── theme/                  # tokens: colors (light/dark), typography, spacing, radius, shadow
    └── copy/                   # user-facing strings (one place for tone review)
```

### 1.3 Data model

Every row has `id` (uuid), `userId`, `createdAt` and `updatedAt`. Dates are stored as local `YYYY-MM-DD` strings. Times are `HH:mm`.

| Entity | Key fields |
|---|---|
| **User** | email, name, passwordHash, salt, focusAreas[], onboardingCompletedAt |
| **Settings** | remindersEnabled, quietHoursStart/End, theme (system/light/dark), reducedMotion, biometricLock, weekStart (Mon) |
| **Goal** | title, focusArea?, myWhy?, desiredOutcome?, status (active/archived/concluded), priority? |
| **Milestone** | ownerType (goal/commitment), ownerId, title, targetDate? or targetCount?, achievedAt? |
| **Commitment** | goalId, title, startDate, durationDays? (null = ongoing), endDate?, status (draft/active/paused/completed/archived), templateId?, renewedFromId?, pausedRanges[] |
| **Habit** | kind (build/reduce), title, goalId?, commitmentId?, icon, status (active/paused/archived), startDate |
| **HabitVersion** | habitId, effectiveFrom. *Build habits:* trackingType (check/duration/quantity), target, unit, minimumVersion?. *Reduce habits:* mode (avoid/limit/taper), limit, baseline?, taperSteps[]. Schedule: type (daily/weekdays/flexWeekly/dates), weekdays[], timesPerWeek, dates[]. Also timeOfDay, reminderTime?, cue/anchor? |
| **Exception** | habitId? or commitmentId? (null = all), date or date range, kind (rest/travel/holiday/busy), note |
| **ActivityLog** | habitId, date, status (full/minimum/partial/skipped/rescheduled), value? (minutes, quantity or amount for reduction), rescheduledTo?, loggedAt |
| **Reflection** | logId? or habitId + date, obstacles[], urgeIntensity?, triggers[], helpNextTime?, note |
| **CheckIn** | date, disposition, energy 1–5, stress 1–5, sleepHours?, sleepRestorative?, note? |
| **AutomaticityRating** | habitId, date, score 1–10 (build habits) |
| **WeeklyReview** | weekStart, gaveEnergy, feltHeavy, note, suggestionsShown[], decisions[] (accepted/edited/dismissed) |
| **CommitmentReview** | commitmentId, reflection, stillMatters (yes/changed), nextStep (renew/extend/adjust/new/keepHabit/finish) |

Two rules protect history:
1. **Edits never rewrite the past.** Changing a target or schedule creates a new `HabitVersion` effective from today. Analytics use the version that applied on each date.
2. **"Missed" is never stored.** It is calculated: an eligible past date with no log.

---

## 2. Analytics and scheduling rules

The product plan left the exact definitions open. These are my proposals, based on the plan and the screens. They will be written as pure functions in `src/domain/` with unit tests before any screen uses them.

### 2.1 Status of a (habit, date) pair

| Status | When | Counts as an opportunity? | Counts as done? |
|---|---|---|---|
| Not scheduled | Schedule doesn't include the date | No | — |
| Planned rest / exception | Exception covers the date, or the habit/commitment is paused | **No** | — |
| Upcoming | Today without a log, or a future date | No (until the day ends) | — |
| **Full** | Logged at or above target | Yes | Yes |
| **Minimum** | Logged as the minimum version | Yes | Yes (shown in a separate colour) |
| **Partial** | Logged some effort below target but above the minimum | Yes | Yes (shown in a separate colour) |
| **Skipped** | User chose to skip | Yes | No (labelled "skipped", not "missed") |
| **Rescheduled** | Moved to another date | No on the original date; the new date counts instead | — |
| **Missed** | Past eligible date with no log | Yes | No |

Past days can be logged or corrected for **7 days**. After that, the history is read-only.

### 2.2 Consistency
- **Consistency = done ÷ eligible opportunities** in the selected period, where done = full + minimum + partial.
- It is always shown with a breakdown bar (full / minimum and partial / skipped / missed) so full effort is never confused with the minimum.
- It is never combined into a "life score". Days with no eligible opportunities are left out.

### 2.3 Flexible weekly habits (N times per week)
- Each week has **N opportunities**. In a week where the habit starts or ends partway, the target is `min(N, eligible days remaining)`. Paused or excepted days reduce the days available, which can lower that target.
- Done = `min(logged sessions, target)`. Extra sessions are shown as "+1 extra" but don't push consistency above 100%.
- Sessions still missing are not counted as missed **until the week ends**. During the week the app shows "2 of 4 this week".
- On Today, a flexible habit appears in a **"This week"** group until its target is met. It is **not** in the daily denominator, so it never makes a day look incomplete.

### 2.4 Reduce/avoid habits
- Each scheduled day is an opportunity. The day counts as **within limit** when:
  - *avoid:* amount = 0
  - *limit:* amount ≤ limit
  - *taper:* amount ≤ the current step's target
- An over-limit day is recorded as a **lapse**. The wording is neutral ("Over today's limit"). It can trigger the optional reflection.
- A day with no log is "not logged". It is shown as a gap and is **not** counted as within limit.
- The trend is the 7-day average vs. the baseline. Changes are shown as a % against the baseline ("−42% vs. baseline").
- Urges (count and 1–5 intensity) are tracked separately from the behaviour itself.

### 2.5 Daily plan completion (Today)
`done today ÷ (habits due today − exceptions)`, for example "3 of 5 completed". Flexible habits are excluded (see 2.3). No streak counter appears anywhere.

### 2.6 Commitment progress
- Day X of N. Ongoing commitments show "Day X" only.
- Sessions: done ÷ eligible so far, plus the number of planned sessions remaining.
- Commitment consistency uses the same formula as §2.2, limited to the commitment's habits and dates.

### 2.7 Automaticity
Optional. The app offers a 1–10 self-rating **at most every 7 days** per build habit, and also during the weekly review. It is always shown separately from consistency and labelled "Self-reported". There is no calculated habit-strength number.

### 2.8 Rule-based suggestions
Suggestions appear in the weekly review, and optionally after a reflection. Each one cites the logs it is based on. The user can **accept, edit or dismiss** each one, and nothing changes silently.

| # | Condition (last 14 days) | Suggestion |
|---|---|---|
| S1 | 2 or more "not enough time" or "forgot" obstacles | Move the preferred time, or add a reminder |
| S2 | 2 or more "low energy" or "too difficult" obstacles, or more than half the sessions done as minimum | Shorten the target (for example 10 → 5 min) |
| S3 | 3 or more skipped or missed in a row | Pause, reschedule, or add planned rest days. The wording carries no guilt |
| S4 | Consistency ≥ 90% for 2 weeks **and** (automaticity ≥ 7 or not rated) | Optional: increase the challenge |
| S5 | Reduction habit with the 7-day average ≤ current target for 2 weeks | Move to the next taper step |
| S6 | The same trigger recorded 3 or more times | Plan an alternative response (free-text "If X, then I will…") |

---

## 3. Using the Stitch screens

### 3.1 Screen map (Stitch → app)

| Stitch folder | App route / use | Notes |
|---|---|---|
| welcome | `(auth)/welcome` | "Get started" opens sign-up; "Sign in" opens sign-in |
| *(not drawn)* | `(auth)/sign-up`, `(auth)/sign-in` | Designed in the same style: inputs from DESIGN.md, primary button |
| areas_to_improve | `(onboarding)/areas` | Step 1 of 2 |
| choose_how_to_start | `(onboarding)/choose-path` | Three paths: template, commitment, single habit |
| today_1 + today_2 | `(tabs)/today` | **Merged:** greeting and week strip, daily completion card, active commitment card(s) with today's habits, "Daily habits" group, "This week" (flexible) group, inline check-in prompt, timer row |
| goals_commitments_2 (+ 1) | `(tabs)/goals` | **Version 2** layout (Active/Archived toggle, goal cards, standalone habits, "Architecture" create shortcuts) plus the compact habit rows from version 1 |
| goal_details (+ goal_detail) | `goal/[id]` | **goal_details** (My Why, target and milestones, active and past commitments) plus the "Behaviors to reduce" section from goal_detail |
| create_goal | `goal/new/direction` | Step 1 of 3 |
| my_why | `goal/new/my-why` | Step 2 of 3. Skippable |
| create_commitment | `commitment/new` | Duration 30/60/90, custom or ongoing; start date; template or build my own |
| add_habit | `habit/new` | Build / Reduce toggle, name, target, minimum version, anchor, time of day, reminder |
| habit_schedule | `habit/new/schedule` | Every day / weekdays / flexible / exact dates, calendar exceptions, anchor time |
| commitment_confirmation | `commitment/new/review` | "Start commitment" or "Edit plan" |
| commitment_details | `commitment/[id]` | Progress, habits, weekly rhythm, milestones, reflections, edit/pause/recalibrate/archive |
| commitment_completed | `commitment/[id]/complete` | Summary, reflection, "still matters?", next step |
| habit_details | `habit/[id]` (build) | Log card (full / low-energy / planned rest / reschedule), 7-day view |
| reduce_habit_details | `habit/[id]` (reduce) | Amount stepper, trigger check-in, 7-day trend vs. limit and baseline, taper controls |
| habit_progress | `habit/[id]/progress` | Month calendar, weekly bars, automaticity, reflections |
| daily_check_in | `check-in` (modal) | Optional, always skippable |
| obstacle_reflection | `reflection/[logId]` (modal) | Opened after skipped, missed, partial or over-limit |
| progress_reflection_2 (+ 1) | `(tabs)/progress` | **Version 2** sections (weekly review banner, consistency, planned vs. completed, rhythm chart, commitments, positive trends, reduction trends, milestones) plus the per-habit weekly grid from version 1 |
| weekly_review | `weekly-review/[week]` | |
| profile_settings | `settings/` | Trimmed (see 3.3) |

### 3.2 Images
Stitch uses stock photos hosted by Google, which may not be licensed for shipping. For the MVP I'll replace them with a small set of bundled, license-free calm images, or with soft gradient panels in the colour tokens. Every image is decorative and can be hidden without losing information.

### 3.3 Where the screens conflict with the product plan (the plan wins)

| In the screens | In the app |
|---|---|
| "Protects streak", "Keep the chain alive", "42 day streak", "0 guilt resets" | No streak language. Use "Kept your rhythm" or "Showed up" |
| "Cognitive Automaticity Level 7", "Effort friction reduced by 43%", "74% more likely…", "neuroplasticity" | Only self-reported values and plain counts. No invented scientific claims |
| "Stored locally with client-side encryption", "Private iCloud", "Linked devices", "Local Sync" | Accurate statement: "Saved on this device. Not shared." No encryption or sync claims yet |
| Membership status / Lifetime member | Removed (everything is free) |
| Telemetry & tracking | Static line: "LifeOS doesn't track you." |
| Weekend grace period toggle | Removed. Planned rest is set per schedule and exception |
| "Log unplanned win" button | Not in MVP. Extra sessions of flexible habits can be logged from Today |
| Typography & scaling setting | Removed. The app follows the system font size (Dynamic Type) |
| Very ornate copy ("Ritual Cadence", "Cadence architecture") | Plain, calm wording. All strings live in `src/copy/` for one review pass |

---

## 4. Starter templates (shipped in MVP)

These are chosen to match the screens, the "Improve my English" example in the plan, and the onboarding focus areas. Each template fills in the generic setup and asks at most two extra questions. The user can edit everything before starting.

| Template | Focus area | Default length | Habits (target / minimum) | Extra questions |
|---|---|---|---|---|
| **Speak English with confidence** | Learning | 30 days, Mon–Fri | Speak aloud 10 min / 2 min · Listen 15 min / 5 min · Learn 5 words / 2 words · *optional reduce:* no social media during study | Current level, main focus (speaking, listening, vocabulary) |
| **Deep focus** | Focus | 60 days, Mon–Fri | Deep work block 90 min / 25 min · *reduce:* checks of email or chat ≤ 3 times per day (limit) | Typical work start time |
| **Sleep restoration** | Health | 30 days, every day | Screens off by 21:30 · Wind-down 10 min / 3 min · Log sleep hours (quantity) | Target bedtime |
| **Mindful mornings** | Well-being | 30 days, every day | Morning stillness 10 min / 2 min · Gratitude note (check) | Preferred time |
| **Movement foundation** | Health | 90 days | Mobility 10 min daily / 3 min · Walk or cardio 3 times per week (flexible) 30 min / 10 min | Current activity level (sets targets) |
| **Less social media scrolling** | Focus | 30 days, every day | *Reduce, taper:* baseline → user target in weekly steps, with trigger tracking | Current daily minutes (baseline), target minutes |

Relationships and Personal Growth have no template in the MVP. They are covered by custom commitments and standalone habits, with example ideas shown as tappable suggestions ("Read 15 min", "Phone-free dinner").

---

## 5. Safety guidance (proposed wording)

**When it appears:** when a reduce/avoid habit is created whose name or category matches alcohol, smoking or nicotine, drugs or medication, gambling, or eating and food restriction. Matching uses a keyword list plus a category picker. It is shown **once at setup** (the user taps "I understand"). After that it is always available from a small "About support" link on that habit's details screen.

> **LifeOS isn't treatment**
> LifeOS can help you notice patterns and work toward your own goals. It isn't medical advice or addiction treatment.
>
> **If you drink alcohol heavily or every day**, stopping suddenly can be dangerous. Please talk to a doctor or pharmacist before you cut down, and consider reducing gradually with their help.
>
> If you feel you can't control [behavior], or it is affecting your health, work or relationships, support is available: a doctor, a pharmacist or a local support service can help.
>
> If you are in crisis or might be in danger, contact your local emergency number now.

For alcohol, **"Avoid entirely" is not the preselected mode**. "Gradually reduce" is preselected instead, with a short note pointing back to the guidance. LifeOS never suggests specific cessation schedules for these behaviours: taper suggestion S5 is turned off for them, and the user sets every step.

---

## 6. Step-by-step implementation plan

Each step should end with the app running on both iOS and Android. ✅ = acceptance criteria.

### Phase 1 — Foundation

**1.1 Create the project**
- `npx create-expo-app@latest lifeos` (SDK 58, TypeScript template), using the `src/` layout from §1.2 and the `@/*` path alias.
- ESLint, Prettier and `jest-expo`. Strict tsconfig.
- `app.json`: name "LifeOS", bundle IDs, light and dark `userInterfaceStyle: automatic`, splash screen and icon (placeholder).
- ✅ The app launches in Expo Go on an iOS and an Android device. `npm test` and `npm run lint` pass.

**1.2 Design system (tokens)**
- Convert the DESIGN.md tokens into `src/theme/`: colours (light), with a **dark palette** derived from them (surface `#121316`, card `#1B1C20`, primary `#B1C5FF` / container `#356BDB`, sage and amber adjusted for contrast), typography scale, spacing, radius and shadows.
- `useTheme()` follows the system setting unless the user overrides it.
- Load the Inter fonts and enable tabular numbers for metrics.
- ✅ A token preview screen (dev only) renders correctly in light and dark mode. Contrast ≥ 4.5:1 for body text.

**1.3 Core components**
Build these components: Button (primary / secondary / ghost), Card, InsetCard, Chip and ChipGroup, TextField and TextArea (with counter), SegmentedControl, SelectableCard (with check), CheckCircle (animated with haptic), ProgressBar, SegmentedProgress, ProgressRing, WeekStrip, StepHeader ("Step 2 of 3", Skip, Back), SectionHeader, ListRow and ToggleRow, Stepper (− value +), BottomSheet, EmptyState, Banner (info / gentle), Icon wrapper.
- ✅ Each component has a dev-gallery entry and light/dark snapshots, and works with screen readers (roles and labels).

### Phase 2 — Data and domain

**2.1 Domain types and engine (test-first)**
- Write `src/domain/` types for §1.3.
- `schedule.ts`: `isScheduled(habitVersion, date)`, exceptions, pauses, rescheduling, versions over time.
- `analytics.ts`: status per date (§2.1), consistency, flexible weekly progress, reduction status and trend, daily completion, commitment progress.
- `suggestions.ts`: rules S1–S6.
- ✅ More than 90% unit-test coverage on `domain/`. Tests cover: an exception day isn't counted, rescheduling moves the opportunity, a flexible week isn't counted as missed mid-week, a partial week lowers the target, a version change doesn't alter past days, and a reduction day with no log isn't counted as within limit.

**2.2 Database and repositories**
- Drizzle schema and migrations on `expo-sqlite`. Every query is scoped to `userId`.
- Repository interfaces (`GoalRepository`, `CommitmentRepository`, `HabitRepository`, `LogRepository`, `ReflectionRepository`, `CheckInRepository`, `ReviewRepository`, `SettingsRepository`, `UserRepository`), each with a SQLite implementation.
- TanStack Query hooks with cache invalidation after changes.
- Template definitions as static typed data (§4).
- ✅ Data survives an app restart. Repository integration tests pass. Changing a single file (`data/index.ts`) would switch to a different implementation.

**2.3 Development build**
- Add `expo-dev-client`. Create development builds for iOS and Android (EAS Build, or local builds).
- ✅ The dev build runs on a physical iPhone and Android phone.

### Phase 3 — Accounts and app shell

**3.1 Authentication (local)**
- Sign-up (name, email, password ≥ 8 characters, confirm password) and sign-in, with errors shown on the form.
- Hash passwords with a salt using `expo-crypto`. Store the session token in `expo-secure-store`. Sign-out.
- Routing gate: no session → `(auth)`; signed in but not onboarded → `(onboarding)`; otherwise → `(tabs)`.
- Add a clear note in the code that this is a placeholder, to be replaced by backend authentication.
- ✅ Two accounts on the same device see only their own data. A wrong password is rejected. The session survives an app restart.

**3.2 Navigation shell**
- Tabs: Today, Goals, Progress, each with its icon. The avatar in the header opens Settings.
- Modal stacks for the create wizards, check-in and reflection.
- ✅ Every route from §3.1 exists, even as a placeholder screen. Back and close behave correctly on both platforms, including the Android back button.

### Phase 4 — Onboarding

**4.1 Welcome, Areas and Choose path**
- Build welcome → sign-up/sign-in, then areas (multi-select, saved to the user) and choose-path.
- ✅ "Skip" on the areas screen works. The chosen path opens the matching flow (4.2).

**4.2 The three starting paths**
- *Template:* template picker filtered by the chosen areas → template questions → commitment review.
- *Commitment:* goal (create, or "decide later" creates the goal inline) → commitment wizard.
- *Single habit:* habit wizard, with no goal needed.
- When the first item is confirmed, mark onboarding complete and land on Today.
- ✅ A brand-new user can reach Today with real scheduled items through each path in under 2 minutes.

### Phase 5 — Goals

**5.1 Create goal**
- Steps: direction (title ≤ 80 characters, optional focus area, optional outcome or milestone, tappable inspiration suggestions) → My Why (optional, skippable, thought starters) → next step (start a commitment / add a habit / later).
- ✅ The goal is saved with or without My Why. Every optional field can be skipped.

**5.2 Goals tab**
- Active/Archived toggle, goal cards (active commitment progress and linked habits), standalone habits list, and create shortcuts.
- ✅ The list updates right after changes. Empty states guide the first action.

**5.3 Goal details**
- Header, My Why card (edit), target and milestones (add, mark achieved), active commitment, behaviours to reduce, past commitments, and actions: create commitment, add linked habit, archive or conclude the goal.
- ✅ Archiving keeps all history. My Why is only shown here, in the weekly review and in renewal (never after a miss).

### Phase 6 — Habits

**6.1 Habit wizard: details**
- Build/Reduce toggle. Optional link to a goal or commitment.
- *Build:* name, tracking type, target, minimum version, anchor (free text plus suggested anchors), time of day.
- *Reduce:* behaviour, mode (avoid / limit / taper), baseline, limit or taper target, common triggers. Show the safety guidance (§5) when needed.
- ✅ Validation per tracking type. The safety screen appears for matching behaviours.

**6.2 Habit wizard: schedule**
- Every day / weekdays / flexible N per week / exact dates. Month calendar preview with exceptions (single day or range, with a type). Reminder time.
- ✅ The calendar preview matches what Today will later show (checked by test against `schedule.ts`).

**6.3 Habit details (build)**
- Anchor, target and minimum cards. Log card: mark complete, low-energy (minimum), partial (enter a value), skip, planned rest, reschedule to later today or tomorrow. 7-day view and list of recent days. Edit parameters (creates a new version), pause, archive.
- ✅ Each action produces the correct status from §2.1. Edits don't change past statuses.

**6.4 Habit details (reduce)**
- Amount stepper and presets, the day's status against the limit, optional trigger check-in, 7-day chart with limit and baseline lines, adjust limit, next taper step (only with confirmation).
- ✅ An over-limit day shows neutral wording and offers a reflection. Trend numbers match `analytics.ts`.

**6.5 Habit timer**
- Start, pause and resume from Today or habit details. Timer state is stored as start and accumulated time, so it survives backgrounding and app restarts. A local notification fires when the target is reached. On stopping, the user can log full, partial or minimum with the elapsed minutes filled in.
- ✅ The timer keeps the correct time after closing and reopening the app. The notification fires once, unless it falls inside quiet hours.

### Phase 7 — Commitments

**7.1 Commitment wizard**
- Goal chip → name → duration (30/60/90, custom number of days, ongoing) → start date → template or build my own → habits (reuses the habit wizard, can add several, build and reduce together) → schedule and exceptions → milestones (optional) → review (commitment_confirmation: plan, rhythm, habits, weekly time estimate) → start.
- Drafts are saved in Zustand, so leaving and coming back keeps progress.
- ✅ After starting, items appear on Today **only on scheduled days**. Before starting, "Edit plan" returns to the chosen step.

**7.2 Commitment details and lifecycle**
- Progress (day X of N, sessions, consistency), linked habits with per-habit consistency, weekly rhythm, milestones, reflections, and actions: edit, pause (with a date range; paused days aren't opportunities) and resume, extend, recalibrate targets, archive or end early.
- ✅ Pausing and resuming leaves consistency unchanged. Ending early keeps the history.

**7.3 Commitment completion**
- Triggered on the first app open on or after the end date (and from the details screen). Shows the summary (sessions, consistency, time invested, rest days respected, milestones, automaticity change if rated), reflection prompt, "Does this goal still matter for the same reasons?" (with a link to edit My Why), and the next step: renew, extend 60/90, adjust the challenge, new commitment, keep habits ongoing as standalone, or finish and archive.
- ✅ Every option keeps the completed commitment and its logs. "Keep habits" unlinks them from the commitment without losing history.

### Phase 8 — Today

**8.1 Today screen**
- Greeting and date; week strip (tap a past day within 7 days to log or correct it; future days are read-only). Daily completion card (§2.5). Commitment groups with today's habits. Standalone habits grouped by time of day. "This week" flexible group. Planned rest shown quietly ("Rest day"). Reflection and check-in entry cards.
- One tap on the check circle logs **full**. Long-press or the row chevron opens a log sheet: minimum, partial (value), skip, reschedule, mark as exception.
- Gentle feedback: check animation and haptic; a small confirmation line when all items for the day are done ("Today's plan is done.").
- ✅ Logging takes 1 tap for the main case. The count updates instantly. Missed items never show red or alarm-style styling.

**8.2 Obstacle reflection**
- Offered (not forced) after skip, partial or over-limit, and for yesterday's missed items the next morning as one optional card. Obstacles are multi-select, plus "What could help next time?" with tappable ideas that can create a suggestion.
- ✅ "Skip for now" always works. The reflection is attached to the log and appears in habit progress.

**8.3 Daily check-in**
- Disposition, energy 1–5, stress 1–5, sleep (optional), restorative toggle, note. At most once per day; it can be edited the same day.
- ✅ Fully optional. It is never scored.

### Phase 9 — Progress and reviews

**9.1 Progress tab**
- Range picker: This week / Last 4 weeks / This month. Weekly-review-ready banner. Consistency card (with breakdown), planned vs. completed (rest days and reschedules counted separately), weekly rhythm chart, per-habit 7-day grid, commitment cards, positive-habit trends, reduction trends vs. baseline, milestones achieved, reflection archive link.
- ✅ All numbers come from `analytics.ts`. They match habit and commitment details for the same range (cross-check test).

**9.2 Habit progress**
- Month calendar coloured by status, weekly bars, time or quantity totals, automaticity rating (prompt and history), urges for reduction habits, reflection list.
- ✅ The calendar legend uses the four statuses from the plan: completed, minimum/partial, rest/exception, skipped/missed.

**9.3 Weekly review**
- Available from Monday for the previous week (banner on Progress and Today; reminder notification on Sunday evening or Monday morning). Shows planned vs. completed, consistency, time invested, a "what gave energy / what felt heavy" prompt (with data hints such as "most completed habit" and "most skipped habit"), a note, an optional "Revisit your why" link, and S1–S6 suggestions, each with accept / edit / dismiss.
- Accepted changes create habit versions from the next Monday.
- ✅ Nothing is applied without an explicit accept. Past weeks keep their old targets.

### Phase 10 — Reminders, settings and privacy

**10.1 Notifications**
- Ask for permission at the first reminder toggle, not at launch. Daily per-habit reminders (only on scheduled days, never on exceptions). Weekly review reminder. Timer end. Quiet hours move notifications to the end of the quiet period, or drop them. Reschedule everything when habits or settings change.
- Gentle wording, for example "Time for 10 minutes of English speaking." Never "You missed…".
- ✅ No notifications on rest days or during quiet hours. Turning reminders off cancels all of them.

**10.2 Settings**
- Profile (name, email, focus areas), reminders and daily anchor times, quiet hours, theme (system / light / dark), reduced motion, biometric lock, export (JSON and CSV through the share sheet), help and LifeOS principles (static, including the safety text), version, sign out, **delete account and all data** (confirmation by typing "DELETE").
- ✅ Delete removes every row for the user and cancels their notifications. The exported data can be read back for a manual check.

**10.3 Biometric lock**
- When enabled, the app asks for Face ID, Touch ID or fingerprint on cold start and after more than 5 minutes in the background, with the device passcode as fallback. If the device has no biometrics, the toggle is disabled with an explanation.
- ✅ The lock screen hides app content in the app switcher. Turning the lock off requires authentication.

### Phase 11 — Quality and release readiness

**11.1 Wording and tone pass**
- Review every string in `src/copy/` against §3.3 and the plan's principles: no guilt, no streaks, no invented science, no pressure from My Why.

**11.2 Accessibility and motion**
- Screen reader labels on every control, touch targets ≥ 44 pt, Dynamic Type up to the large accessibility sizes, Reduced Motion respected, colour never the only signal (status icons as well).

**11.3 Edge cases**
- Day change while the app is open; timezone or daylight-saving changes; a commitment starting in the future; an empty state for every screen; a habit edited mid-week; 365 days of logs (a performance check with a seed script).

**11.4 Testing on devices**
- A manual test script covering the full journey from §6 of the product plan (Improve my English), on one iOS and one Android phone, in light and dark mode.

**11.5 Release preparation (optional for MVP)**
- `eas.json` profiles (development / preview / production), app icons and splash screen, store metadata draft. Submission itself is left for later.

---

## 7. Suggested order and milestones

| Milestone | Steps | Result |
|---|---|---|
| M1 Foundation | 1.1 – 2.3 | Running app, design system, tested engine, database |
| M2 Accounts and onboarding | 3.1 – 4.2 | A new user can sign up and create a first habit or commitment |
| M3 Daily use | 5.1 – 6.5, 8.1 – 8.3 | Goals, habits, Today logging, reflections, check-ins, timer |
| M4 Commitments | 7.1 – 7.3 | Full commitment lifecycle including renewal |
| M5 Insight | 9.1 – 9.3 | Progress, habit progress, weekly review with suggestions |
| M6 Settings and polish | 10.1 – 11.5 | Reminders, settings, lock, export/delete, accessibility, device testing |

## 8. Implementation notes (what was built differently, and why)

Recorded 2026-11-22 during the MVP build.

| Plan | Built | Why |
|---|---|---|
| `expo-sqlite` + Drizzle ORM | One JSON document per user in AsyncStorage, behind the same `Repository` interface (`src/data/repository.ts`) | Works the same on iOS, Android and web (which made automated UI testing in a browser possible). An MVP user's history stays small. The interface is unchanged, so SQLite or an API can replace it later |
| TanStack Query hooks | A Zustand store holds the signed-in user's data in memory; every write goes through `src/data/actions.ts` and is saved after a short delay | No network layer yet, so a query cache added complexity without benefit. Swap it in with the backend |
| `react-hook-form` + `zod` | Plain component state with inline validation | The forms are small; fewer dependencies |
| `Stack.Protected` route guards | A small redirect effect in `src/app/_layout.tsx` | The guard produced an unmatched `/(auth)` URL on web |
| Template milestones per habit ("20 speaking sessions") | Milestones count total sessions in the commitment ("45 practice sessions") | Milestones aren't linked to a single habit in the data model |
| Stock photos from Stitch | Soft gradient panels in the colour tokens | Licensing; see §3.2 |

Also added beyond the plan: a development-only **Load sample data** row in Settings, and an app icon in the design colours.

**Acceptance status (2026-11-23).** Every step in §6 is implemented. Verified with 49 automated tests (core logic coverage: 97% of statements), typecheck, lint, `expo-doctor`, browser UI testing at phone size, and Android emulator testing in Expo Go. Not verifiable on the build machine:
- **iOS** (no Mac). Run `docs/TEST_SCRIPT.md` on an iPhone, e.g. with an EAS development build (`eas build --profile development --platform ios`).
- **Local Android development build (2.3).** The C++ build exceeds the Windows 260-character path limit. Enable `LongPathsEnabled` in Windows or use EAS cloud builds (`eas.json` is set up).
- Supporting docs: `docs/TEST_SCRIPT.md` (11.4) and `docs/STORE_LISTING.md` (11.5). The design-system gallery is under Settings → Design system in development builds (1.2–1.3).

## 9. Ready for a future backend
- Screens only use hooks, hooks only use repository interfaces, and repositories are the only code that knows about SQLite.
- All IDs are UUIDs and all rows have `updatedAt`, so the data is ready for later sync.
- Local authentication sits behind an `AuthService` interface and will be replaced by real backend authentication. Local password hashes are then discarded.
