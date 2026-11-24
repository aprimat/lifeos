# LifeOS — Manual test script

Plan 11.4: the "Improve my English" journey from `LifeOS_App_Plan.md` §6, plus key edge cases.
Run on one iOS and one Android phone, in light and dark mode. Tick each step.

## Setup
- Fresh install (or Settings → Delete account and all data).
- Allow notifications when asked (step 4.2).

## 1. Account and onboarding
1. Welcome → **Get started**. Try a 5-character password → "Use at least 8 characters."
2. Mismatched confirm password → "Passwords don't match." Fix it → error clears.
3. Create the account → **What areas matter most?** Select Learning → Continue.
4. **Choose how to begin** → Choose a template → **Speak English with confidence**.
5. Answer "Comfortable with basics" / "Speaking", keep the optional habit off, 30 days, start Today → **Review plan**.
6. Review shows the goal, Mon–Fri rhythm, Sat/Sun planned rest, 3 habits with minimum versions, ~weekly time → **Start commitment**.
7. Lands on **Today**. On a weekday the 3 habits appear under "Your commitment"; on a weekend the card says it's a rest day.

## 2. Daily use
1. Tap the circle on **Practice speaking** → done, count updates ("1 of 3"), haptic on phones.
2. Long-press **Listen to English** → log sheet → **Minimum version**. Shown in sage, counts as done.
3. **Learn new words** → **Skip** → "What got in the way?" link appears → pick "Low energy", add a note → Save.
4. Start a timer on a duration habit, background the app for a minute, return → time kept. Stop → log prefilled.
5. Daily check-in → choose Grounded, energy 3 → Save. Card disappears for today.

## 3. Schedule and exceptions
1. Commitment details → Plan exceptions → add a 2-day Travel exception next week.
2. Today on those days shows rest; Progress counts them as rest, not missed.
3. Habit details → **Reschedule** → tomorrow. Today's item disappears; tomorrow shows it.

## 4. Reminders and quiet hours
1. Settings → Gentle reminders ON → allow permission.
2. Edit a habit → reminder 08:00. A notification arrives at 08:00 on scheduled days only.
3. Set quiet hours to cover 08:00 → no 08:00 notification on the next day; it moves to the end of quiet hours if early morning.

## 5. Progress and review
1. Settings → Load sample data (development builds only).
2. Progress: consistency %, breakdown legend (full / minimum-partial / skipped / not logged), rhythm chart, 7-day grid, reduction trend vs baseline.
3. Weekly review: accept one suggestion → Habit edit shows the new target **from next Monday**; past weeks unchanged.
4. Commitment details: first milestone shows "Reached <date>" without opening anything else.

## 6. Reduce habit with safety guidance
1. Add a habit → Reduce → "Drinking alcohol". Approach switches to **Gradually reduce**, unit to drinks.
2. Step 3 shows "LifeOS isn't treatment" with the alcohol paragraph → **I understand**.
3. Habit details has "About support". Log 4 drinks (over limit) → neutral "Over today's limit" wording.

## 7. Commitment end
1. Use a 30-day commitment past its end date (or edit the length to end yesterday).
2. Today shows "<title> has reached its end date" → look back screen → **Keep the habits going** → habits continue tomorrow as standalone; the finished commitment and its history remain.

## 8. Privacy and account
1. Settings → Export full archive (JSON) and activity log (CSV) → share sheet opens; files open correctly.
2. Biometric lock ON → background the app for 5+ minutes → returns locked; app switcher shows the lock cover.
3. Change email to another account's address → "Another account on this device already uses this email."
4. Sign out → sign in again → data intact. Delete account (type DELETE) → back to Welcome; signing in fails.

## 9. Accessibility and appearance
1. Dark mode: all screens readable; no pure-white panels.
2. Largest system text size: nothing clipped on Today, Progress and the log sheet.
3. Screen reader: every button and check circle has a label; status isn't conveyed by colour alone.
4. Reduced motion ON → check circles don't animate.

## 10. Review fixes (PR #2)
- [ ] **Log sheet value.** Log "8" on one amount habit, then long-press another habit on Today. Its sheet opens with its own number, with no flash of "8".
- [ ] **Move to tomorrow.** On a daily habit, long-press → the log sheet has no **Move to tomorrow** (tomorrow is already scheduled). On a Mon/Wed/Fri habit on a Monday, the option is there. In Habit details → Reschedule, only free days are offered.
- [ ] **Urges kept.** On a reduce habit's details, log 3 with urges on (5, intensity 4) → Save. On Today, long-press it → change to 2 → Save. The habit's progress screen still shows the urges.
- [ ] **Reduce units.** New habit → Reduce → in "Measured in", type `minutes` in the custom unit field. It reads "minutes", not "utes". Clear the field → the **Times** chip is selected.
- [ ] **Amount unit.** New habit → Build → tracking **Amount**. The target shows "5 times" (not "5 min"), and the unit field is empty.
- [ ] **Double tap.** Tap **Save habit** twice quickly → only one habit appears. Tap **Create account** twice quickly → only one account is created.
- [ ] **New goal reused.** New commitment → type a new goal name → Template → Continue → Back → Continue → the Goals tab has only one goal with that name.
- [ ] **Old draft starts today.** Leave a commitment draft for a day, then open it and tap **Start commitment** → it shows Day 1, and earlier days aren't counted as missed.
- [ ] **Renew mid-way.** Mid-commitment, log a habit → Commitment details → Finish and review → Renew → Confirm. Today's log stays on the old commitment, and the new one starts tomorrow. A double tap on Confirm creates only one new commitment.
- [ ] **Pause/resume same day.** Pause a commitment, then resume it straight away → today's habits are back on Today and can be logged.
- [ ] **Archive today.** Log a habit, then archive it the same day → today's session still shows in its history.
- [ ] **App lock.** Settings → turn App lock on → Face ID asks once, not twice. With a sheet or the Reflection screen open, background the app for 5+ minutes → on return the lock screen covers everything. Pull down Control Center → the cover hides open sheets too.
- [ ] **Flexible reminders.** Pause a 3×/week habit that has a reminder → no more reminders for it. After 3 sessions this week, no more reminders until Monday.
- [ ] **Timer over midnight.** Start a timer just before midnight → after midnight Today stays on the earlier day with the timer visible. Stop it → the minutes are logged to the day it started.
- [ ] **Back to habit.** Progress tab → open a habit's progress → **Back to habit** opens the habit details, not the Progress tab.
- [ ] **VoiceOver.** The Today week strip and the month calendar read dates such as "Tuesday, November 24", not "2026-11-24". The 7-day status circles and the rhythm-chart bars can each be focused.

## 11. Installed build over the cable (PR #3)
- [ ] With the iPhone connected and unlocked, `npm run release:ios` → LifeOS opens on the phone with its own icon (if asked, Trust the developer in Settings → General → VPN & Device Management).
- [ ] Fully close LifeOS and reopen it → it launches normally. After the next published update, reopening loads it (or shows **Update ready → Restart**).
- [ ] Settings → **Load sample data** is available (dev tools are on in this build).
- [ ] Settings → App lock ON → Face ID asks once → background for 5+ minutes → returns locked and Face ID unlocks it (Face ID works here, unlike Expo Go).
