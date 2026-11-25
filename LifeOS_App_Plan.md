# LifeOS — Product Plan

**Status:** Draft for review
**Version:** 1.4
**Updated:** November 24, 2026
**Replaces:** `LifeOS_App_Plan.md` (v1.3) and the draft `LifeOS_App_Plan_v1.3.md` once approved.

## 1. Vision

LifeOS helps people gain more by doing less. It should be **lightweight, motivating, and make progress easy to see.**

**The one rule:** creating and logging a habit is the core. Everything else (goals, commitments, reports) is optional and must never add friction to the core.

LifeOS is not a task manager. It is for things you repeat.

## 2. What the user sees: two things, plus one optional promise

| Concept | What it is | Examples |
|---|---|---|
| **Habit** (core) | Something you repeat: build it or reduce it | Read 20 min · Workout 3× a week · Avoid sugary drinks |
| **Goal** (optional) | A result you want. Not something you tick off. | Improve health · Get promoted · Lose 5 kg |
| **Commitment** (optional) | "For N days I will follow these habits." One at a time. | For 30 days: walk daily, meditate 3× a week |

**Rules**

- A habit can exist alone. It can support **one or more goals**.
- Goals are a **flat list**: no epics and no sub-goals. A big yearly aspiration ("Improve health") and a concrete result ("Lose 5 kg") are both just goals.
- The app teaches the difference with examples, not explanations:
  - Goal field: "e.g. Improve health, Get promoted"
  - Habit field: "e.g. Read 20 min, Walk 8k steps"
- **One** commitment at a time, never required. It points at habits and does not own them. **Habits always continue after it ends.**
- The only word for the repeating thing is **Habit**. No "activity", no "session", no "program".

## 3. Navigation

Bottom bar: **Today · Habits · Progress**. Settings via the profile button.

- **Today:** the habits due today, one-tap logging, today's progress. While a commitment runs, one small line: "Day 12 of 30 · 86%".
- **Habits:**
  - All habits, grouped by goal, with a "No goal" group last.
  - Tap a goal's header to open the goal: its habits and how they're going.
  - "+ Habit" (the main action) and **"Make a commitment"**.
- **Progress:** weekly and monthly reports, success rate per habit, why you missed, the commitment's report.

## 4. Creating a habit (the core)

One screen. Required: **what** and **when**. Everything else is optional with sensible defaults.

| Field | Example | Required |
|---|---|---|
| Build or reduce | Build | yes (default Build) |
| What | Read | yes |
| How much | 20 min · 10 pages · check only | default: check only |
| When | Daily · Mon/Wed/Fri · 3× a week · specific dates | default: Daily |
| Time of day / reminder | Morning · 08:00 | no |
| After what / where (cue) | "After coffee" | no |
| Minimum version (busy-day backup) | 5 min | no |
| Goals | Improve health (pick, create inline, or leave empty) | no |
| Reduce only: avoid / limit / taper, baseline, triggers | Limit 2 cups | when Reduce |

Kept from today's app: rest days and exceptions, pause, reschedule, timer, edits that apply from a date onward without rewriting history.

## 5. Managing it

Done in one tap, log an amount, minimum version, skip, move to tomorrow, rest day, timer. After a skip or miss, optionally ask **"What got in the way?"** (quick reasons, never forced).

## 6. Measuring progress

- **Success rate per habit.** Full, minimum and partial count as done; rest days, exceptions and pauses don't count against you.
- **Weekly report** (exists) and **monthly report** (new).
- **Why you missed** (new): sums up the saved reasons, e.g. "6 of 9 misses: no time, mostly evenings".
- **Goal progress:** how its habits are going, plus the user can mark a goal **achieved** (new).
- **Commitment report:** the same report screen, for the chosen habits and dates.

**Motivating, concretely:**

- The minimum version is a win, not a failure.
- Misses never shame. The app asks why, then suggests a fix the user approves.
- Reports lead with what went well, then one thing to adjust.
- No punishing streak resets.

## 7. Commitment

1. Habits → **Make a commitment**.
2. Pick one or more habits (or create one inline).
3. Pick a duration: **7 / 30 / 60 / 90 days** or **until a date**. 30 is suggested.
4. Confirm one sentence: "For 30 days I'll walk daily and meditate 3× a week."
5. While it runs: the progress line on Today. It can be ended early.
6. At the end: the report, then **Renew** (same habits, new period), **Change** (pick again) or **Done**. Habits keep going either way.

Only one at a time: while one runs, the button shows the current commitment instead.

## 8. Onboarding

1. A short welcome.
2. **"What do you want to do regularly?"** Create the first habit, or pick one from templates.
3. Optional: "Is this for a bigger goal?"
4. Land on Today.

No goal, commitment or focus-area questions are required.

## 9. What changes in the current app

| Area | Today | After v1.4 |
|---|---|---|
| Tabs | Today · Goals · Progress | Today · **Habits** · Progress |
| Habit ↔ goal | one goal | **several goals** |
| Habit ↔ commitment | the habit belongs to a commitment, stops when it ends, is copied on renew | the commitment points at habits; **habits never stop or get copied** |
| Commitments | several at once, linked to a goal, drafts, ongoing option | **one at a time**, no goal link, fixed length or until a date |
| Milestones | on goals and commitments | **removed from the UI** (goal "achieved" replaces them) |
| Monthly report, miss reasons summary, goal achieved | missing | new |

**Existing data on the phone is migrated, not lost:**

- A habit's one goal becomes a list of one.
- Habits that belonged to a commitment become independent and keep all their logs.
- If several commitments are running, the most recent stays and the others are marked finished.

## 10. Build order (each step is its own trial and "ship it")

1. **Data model and migration.** Habits get a list of goals, commitments point at habits, migration of saved data. Almost no visible change.
2. **Habits tab replaces Goals.** Habits grouped by goal, goal detail screen, goal "achieved".
3. **Habit form.** Pick several goals, create a goal inline.
4. **Commitment rework.** The button, pick habits and duration, the sentence, the Today line, one at a time, the end flow.
5. **Monthly report.** It is also used for the commitment report.
6. **Why you missed** summary in Progress.
7. **Simpler onboarding.**

## 11. Ideas for later (not in v1.4)

- An **if-then plan** on a habit ("If I'm too tired, I'll read one page in bed"), offered after repeated misses.
- **"This is automatic now"**: retire a habit as established and celebrate it.
- A **too-many-habits** nudge when someone adds more than 3–5 at the start.
- A **welcome back** screen after a long break.
- Goal metrics (85 → 75 kg).
- AI coaching, wearables, social features.

## 12. Open questions

- Remove milestones completely, or keep them hidden for later?
- Should goals keep a focus area (health, learning…) for grouping and onboarding, or drop it?

## 13. Change log

| Date | Version | Change |
|---|---|---|
| 2026-11-22 | 1.0–1.3 | See `LifeOS_App_Plan.md`. |
| 2026-11-24 | 1.4 | Habit is the core. Flat optional goals (no epics or sub-goals), several goals per habit. One optional commitment at a time that never owns habits. Tabs Today · Habits · Progress. Monthly report, miss reasons, goal achieved. Milestones out of the UI. |
