# LifeOS — Product Plan

**Status:** Agreed working product plan  
**Version:** 1.3  
**Last updated:** November 22, 2026  
**Purpose:** Product vision, concepts, and user flows only. Implementation details belong elsewhere.

## 1. Vision

LifeOS helps people improve their lives by turning meaningful goals into small, repeatable actions. It supports both **building helpful habits** and **reducing unwanted behaviors**, while making room for real-life schedules, setbacks, and reflection.

**Core loop:** Set a goal → Make a commitment (optional) → Choose habits → Follow the schedule → Reflect and review → Adjust and continue.

The experience should be encouraging, flexible, calm, and useful without AI.

## 2. Product concepts

| Concept | Meaning | Example |
|---|---|---|
| **Goal** | A long-term outcome or direction; may be measurable or open-ended; can include an optional personal reason ("My Why") | Improve my English; live more mindfully |
| **Commitment** | A time-bound or ongoing personal promise to work toward a goal | Practice English consistently for 30 days |
| **Habit** | A repeated action to build, or behavior to avoid/reduce | Speak English 10 minutes; limit social media to 20 minutes |
| **Milestone** | A meaningful checkpoint | Complete 20 speaking sessions |
| **Activity/log** | What was scheduled and what actually happened on a particular date | Completed, minimum version, partial, skipped, missed, or rescheduled |

**Relationships and flexibility:**

- A goal may have several commitments over time, and may also have habits directly linked to it.
- A commitment belongs to a goal and contains one or more habits; positive and reduction habits can coexist.
- A habit can exist on its own, without requiring a commitment or even a goal.
- Commitments offer **30, 60, and 90 days** as presets, plus custom durations and an ongoing option.
- A goal does not have to be completed when one commitment ends. Users can renew, change, or conclude a commitment while preserving its history.
- **Commitment** replaces the earlier term **Program** in the product experience. Ready-made **templates** are starting points, not mandatory programs.

## 3. Core experience principles

- **Start small:** Offer achievable targets and an optional minimum-effort version.
- **Make actions obvious:** Help users identify when, where, or after which existing routine an activity will happen.
- **Make action easy and satisfying:** One-tap logging, clear progress, and subtle celebrations.
- **Systems over outcomes alone:** Goals give direction; habits create repeatable action.
- **Support identity and motivation:** Invite users to reflect on why a goal matters ("My Why") and who they want to become, without requiring an answer or using guilt-inducing reminders.
- **No guilt or all-or-nothing streaks:** A missed day is information, not failure; encourage returning the next day.
- **Respect real schedules:** Planned rest days, exceptions, and rescheduling must not count as missed activities.
- **Honest measurement:** Show observable consistency and user-reported feelings, not invented scientific habit-strength claims or a universal life score.
- **User control:** All suggestions are optional; never silently change targets or schedules.
- **No AI in the initial release:** Use templates, user input, straightforward calculations, and rule-based suggestions.

## 4. Main navigation

1. **Today:** Scheduled activities, simple logging, daily plan completion, optional well-being check-in, and optional reflection.
2. **Goals:** Goals, commitments, linked and standalone habits, templates, calendars, milestones, and editing.
3. **Progress:** Habit consistency, commitment progress, behavioral trends, reflections, and weekly reviews.

**Profile & Settings:** Reminders, quiet hours, preferences, privacy, and account/data controls.

## 5. Main user workflows

### 5.1 Onboarding

1. Welcome user and explain the small-steps approach.
2. Ask what they want to improve (e.g., learning, health, focus, well-being, relationships) and optionally select priority goals.
3. Offer three clear starting paths: **choose a template**, **create a custom commitment**, or **add a habit directly**.
4. Ask only the setup questions necessary for the chosen path; let users adjust later.
5. Confirm the first actions and open Today.

### 5.2 Create a goal

1. Name the desired outcome or direction.
2. Ask **"Why does this goal matter to you?"** as a short, optional personal reflection ("My Why"); allow users to skip, write a sentence, or edit it later.
3. Optionally add a measurable target or milestone; these are not required for every goal.
4. Choose to start a commitment, add a habit directly, or leave the goal for later.
5. View and manage the goal's commitments, habits, progress, and personal motivation from Goals.

### 5.3 Create a commitment

1. Select an existing goal or create one.
2. Choose a **ready-made template** or **build from scratch**.
3. Name the commitment and select 30/60/90 days, a custom duration, or ongoing.
4. Add or customize habits, targets, schedules, and optional milestones.
5. Review the upcoming calendar and planned exceptions; adjust it before starting.
6. Confirm. Activities appear on Today only when scheduled.
7. Later edit, pause, extend, finish, renew, or archive the commitment without erasing history.

**Templates vs. flexibility:** Every goal/commitment uses a **generic core setup** (what to change, target, frequency, dates, timing/cue, duration). Optional goal-specific templates may ask a few extra questions and prefill suggestions (e.g., English level for a language-learning template). Templates are never required; users can create any goal or commitment themselves.

### 5.4 Create or manage a habit

1. Choose **Build a habit** or **Reduce/avoid a behavior**.
2. Describe the behavior and choose a tracking style and target.
3. Choose an appropriate schedule: every day, selected weekdays, flexible number of times per week, or specific calendar dates.
4. Optionally set preferred time, reminder, context/cue, and minimum-effort version for positive habits.
5. Optionally connect the habit to a goal or commitment; standalone habits are allowed.
6. Save, then edit, pause, reschedule, or archive as needed.

### 5.5 Build a positive habit

1. Set a repeatable action (e.g., speak English for 10 minutes).
2. Optionally connect it to an existing routine (habit stacking) or choose a helpful environment cue.
3. On scheduled days, mark **full completion**, **minimum/partial completion**, or **skipped**.
4. Track consistency against scheduled opportunities and review gradual progress.

### 5.6 Reduce or stop an unwanted habit

1. Identify the behavior (e.g., scrolling, news consumption, smoking, alcohol use).
2. Choose **avoid entirely**, **stay below a limit**, or **gradually reduce toward a user-defined target**.
3. Optionally record a baseline and common triggers.
4. Log the actual behavior or whether the daily limit was met; record lapses without shame.
5. Optionally reflect on triggers, urges, and what could help next time.
6. Review trends against the baseline and adjust the target with user approval.

**Safety boundary:** LifeOS is not addiction treatment. It should not prescribe smoking/alcohol cessation regimens or claim to manage withdrawal. Abrupt alcohol cessation can be dangerous for dependent users; the app should direct users to professional support where appropriate.

### 5.7 Schedule and plan exceptions

1. While creating a habit or commitment, choose recurring weekdays, flexible weekly frequency, or exact calendar dates.
2. Preview the full commitment calendar and exclude known travel, busy days, holidays, or rest days.
3. During the commitment, reschedule upcoming activities, mark an exception, or pause temporarily.
4. Clearly distinguish **not scheduled**, **planned rest/exception**, **skipped**, and **missed**; do not penalize rest days.
5. For flexible weekly habits, show progress toward the weekly target without requiring a specific day.

### 5.8 Follow the daily plan

1. Open Today to see only activities due today, grouped simply.
2. Log a completed activity in one tap, or record a duration/quantity where relevant.
3. Choose minimum/partial completion, skip, or reschedule when appropriate.
4. See **daily plan completion** (e.g., 3 of 5 scheduled activities), not a judgmental overall life score.
5. Receive subtle positive feedback and optionally record mood, energy, stress, sleep, or a short note.

### 5.9 Reflect on obstacles and lapses

1. After a skipped, missed, partial, or over-limit activity, optionally ask: **What got in the way?**
2. Offer quick reasons such as time, forgetting, low energy, difficulty, motivation, unexpected event, or a trigger/urge; allow a custom note.
3. Optionally ask: **What could help next time?**
4. Save the reflection without forcing it or adding guilt.
5. Use repeated patterns to offer simple suggestions, such as shortening a habit, moving its time, adding a reminder, or planning an alternative response.

### 5.10 Track progress and habit development

1. Open Progress for a day, week, month, habit, goal, or commitment.
2. Show **consistency** as completed scheduled opportunities divided by eligible scheduled opportunities; distinguish full and minimum/partial completions clearly.
3. Show useful measures such as sessions, minutes, quantities, milestones, and reduction relative to a baseline.
4. Optionally ask periodically how **automatic/easy** a positive habit feels (self-reported, e.g., 1–10).
5. For unwanted habits, optionally track **urge frequency/intensity** and behavior trends separately.
6. Avoid presenting a scientifically validated habit-strength number unless there is actual evidence for that claim. Avoid conflating habit consistency with automaticity.

### 5.11 Weekly review and adjustments

1. Show a concise summary of planned vs. completed activities, milestones, and trends.
2. Invite optional reflection: what worked, what was difficult, and what should change? Users may revisit their original **"My Why"** if helpful, but it should not be repeatedly shown after misses.
3. Offer rule-based suggestions grounded in logged patterns, not AI-generated claims.
4. Let the user accept, edit, or dismiss each suggestion.
5. Carry approved changes into the next week, keeping prior history intact.

### 5.12 Finish or renew a commitment

1. At the end date, summarize effort, completion, milestones, and relevant trends.
2. Celebrate progress without implying the entire long-term goal is finished. Optionally ask **"Does this goal still matter to you for the same reasons?"** and let the user revise their motivation or priorities.
3. Offer **renew**, **extend**, **adjust the challenge**, **create a new commitment**, or **finish and keep the habit ongoing**.
4. Preserve the completed commitment and its activity history.

### 5.13 Preferences and privacy

1. Configure reminders and quiet hours.
2. Manage personal preferences and account settings.
3. Review, export where supported, or delete personal data and account.

## 6. Example journey: Improve my English

1. **Goal:** Improve my English (long-term). Optionally record **My Why:** "I want to speak more confidently at work and connect with people."
2. **Commitment:** Speak English more confidently for 30 days.
3. **Setup:** Either choose an English-speaking template (which may ask current level and learning focus) or create a custom commitment without any language-specific questions.
4. **Habits:** Listen for 10 minutes, speak aloud for 5 minutes, and learn 5 words on chosen days. Optionally add a reduction habit: no social media during study time.
5. **Schedule:** Monday–Friday, excluding two known travel days. Planned exceptions are not failures.
6. **Today:** Complete activities, log a minimum version on busy days, and optionally reflect after misses.
7. **Weekly review:** See scheduled-versus-completed sessions and choose whether to adjust difficulty or timing.
8. **Day 30:** Review results, then renew the commitment or continue habits independently. The goal can remain active.

## 7. Initial release (MVP)

**Include:**

- Guided onboarding with template, custom-commitment, and direct-habit paths
- Goals with optional **"My Why"** personal motivation, editable in goal details, plus optional measurable outcomes and milestones
- Commitments: 30/60/90 days, custom duration, ongoing; create/edit/pause/finish/renew
- Generic setup for any goal, commitment, or habit; small starter template library
- Positive habits and reduce/avoid habits with appropriate tracking
- Recurring, flexible-weekly, and specific-date scheduling; planned exceptions and rescheduling
- Today checklist, full/minimum/partial/skip/miss tracking, honest daily completion
- Optional obstacle/trigger reflection after difficulties
- Basic consistency, baseline/reduction trends, and optional self-reported automaticity/urges
- Weekly reviews, optional revisiting of personal motivation, simple rule-based suggestions, and milestones
- Optional well-being check-ins; reminders; basic privacy/account settings
- Required account (sign up/sign in), dark mode, habit timer, optional biometric app lock

**Later / not required for MVP:**

- AI coach, chatbot, or AI-generated commitments
- Extensive specialized template library
- Wearable and screen-time integrations or automatic behavioral detection
- Social networks, leaderboards, virtual pets, or heavy gamification
- Voice coaching and advanced predictive analytics
- Sophisticated or purportedly clinical habit-strength modeling

## 8. Design direction

- Premium, bright, minimal, professional, and calm; not childish or overly colorful.
- Clear **Today / Goals / Progress** navigation and quick daily interactions.
- Simple enough to create one habit quickly, flexible enough for a custom multi-habit commitment.
- Subtle animations, supportive language, visible progress, and no harsh streak resets.
- Keep setup questions proportional to the user's choice; avoid unnecessary questionnaires. Ask **"Why does this goal matter to you?"** gently and make it skippable.
- Treat personal motivations as private reflections; do not use them to shame, pressure, or repeatedly remind users of missed activities.

## 9. Resolved decisions and open questions

**Resolved (v1.3):**

- **Product name:** LifeOS.
- **Starter templates (MVP):** Speak English with confidence, Deep focus, Sleep restoration, Mindful mornings, Movement foundation, Less social media scrolling. Details are in `IMPLEMENTATION_PLAN.md` §4.
- **Account:** Required. Users create an account and sign in before creating their first habit.
- **Analytics definitions:** Full, minimum and partial count as done, and the breakdown is always shown. Skipped and missed count as not done. Rest days, exceptions, pauses and rescheduled originals are not opportunities. A flexible weekly habit has N opportunities per week, and unmet sessions only count as missed once the week ends. Full rules are in `IMPLEMENTATION_PLAN.md` §2.
- **Paid features:** None. Everything is free.
- **Safety guidance:** Shown once when creating a reduction habit for alcohol, smoking, drugs, gambling or eating, and always available from that habit afterwards. The wording is in `IMPLEMENTATION_PLAN.md` §5.
- **Platform:** React Native (Expo) for iOS and Android. No backend yet; data is saved on the device behind a replaceable data layer.
- **Added to MVP:** Dark mode, a habit timer and a biometric app lock (from the UI designs).

**Still open:**

- Which milestones create value without complicating the MVP.
- Backend, sync and real authentication (after MVP).

## 10. Plan maintenance and change log

**This Markdown file is the source of truth for LifeOS product decisions and flows.** When proposing a feature, decide whether it is MVP, later, or rejected; update the affected sections and record the decision here. Do not rely on conversation memory to reconstruct the plan.

| Date | Version | Change |
|---|---|---|
| 2026-11-22 | 1.0 | Initial goal-and-habit plan; non-AI MVP. |
| 2026-11-22 | 1.1 | Adopted **Commitment** instead of Program; clarified goal/commitment/habit/milestone relationships; added generic setup and optional templates, fully custom commitments, direct habits, positive and reduction habits, specific-date and flexible scheduling, planned exceptions, optional obstacle reflections, consistency vs. self-reported automaticity/urges, and commitment renewal. |
| 2026-11-22 | 1.2 | Added optional **"My Why"** reflection during goal creation, editable in goal details; optional revisit during weekly review and commitment renewal; explicitly avoid guilt-inducing or repetitive motivation reminders. |
| 2026-11-22 | 1.3 | Resolved open questions: name LifeOS, account required, all features free, six starter templates, analytics definitions, safety wording. Chose Expo/React Native with on-device storage and no backend yet. Added dark mode, habit timer and biometric lock to MVP. Implementation steps are in `IMPLEMENTATION_PLAN.md`. |
