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

## 12. Which update is running (PR #4)
- [ ] On the cable-installed app, fully close LifeOS and reopen it, then open Profile & settings → About → **Version** → under "1.0.0" it reads "Update of <date>, <time>" matching the latest update (Expo dashboard). Right after a fresh `npm run release:ios`, before any update, it reads "Built-in version".

## 13. v1.4 step 1: habits no longer belong to commitments (PR #5)
- [ ] **Nothing lost.** Install the update with your existing data → Today shows the same habits as before, and each habit's history and Progress numbers are unchanged.
- [ ] **Old finished commitment.** A habit that belonged to a commitment you'd already finished doesn't come back on Today (it shows as archived in the goal's history).
- [ ] **Ran past its end.** A commitment that reached its end date without you finishing it: its habits show "Paused" on their details screen. Open the commitment → Finish and review → **Finish** → Confirm → the habits are back on Today from today, and the days in between aren't counted as missed.
- [ ] **Finish keeps habits.** Commitment details → Finish and review → **Finish** → Confirm → its habits stay on Today tomorrow. "Keep the habits going" is no longer offered (it's what Finish does now).
- [ ] **Renew, no copies.** Finish and review → **Renew** → Confirm → Goals → the goal lists each habit once (no duplicate copies), and the habit's history continues on the same habit.
- [ ] **Pause together.** Commitment details → Pause → its habits leave Today. Resume → they come back. A habit you had paused yourself before stays paused.
- [ ] **End early wording.** Commitment details → Archive or end early → the sheet says your habits keep going on Today.

## 14. v1.4 step 2: Habits tab replaces Goals (PR #5)
- [ ] **Bottom bar.** It reads **Today · Habits · Progress**. Habits has a repeat icon.
- [ ] **Grouped by goal.** Habits tab → each goal is a header with its habits under it; habits without a goal are under **No goal** at the bottom. A goal with no habits shows "No habits yet. Add one" → tapping it opens New habit with that goal already linked.
- [ ] **Paused.** A paused habit shows "Paused" on the right instead of a percentage.
- [ ] **Buttons.** **New habit** opens the habit form. **Make a commitment** opens the commitment flow. While a commitment is running, the button is replaced by a "Current commitment" card (Day X of Y, %); tapping it opens the commitment.
- [ ] **Goal screen.** Tap a goal header → you see "Last 4 weeks" (% and "N of M planned sessions done"), My why, the habits for this goal and **Add a habit**. There are no milestones or commitment sections any more.
- [ ] **Achieved.** Goal → **Mark as achieved** → **Yes, I achieved it** → the goal shows "Achieved" with today's date and a "You reached this goal" note. Back on Habits, the goal still groups its habits with an "Achieved" pill. **Not achieved yet: reopen** makes it active again.
- [ ] **Archived list.** Archive a goal → its habits move to **No goal**. At the bottom, **Achieved and archived (N)** expands to list achieved/archived goals and archived habits; tapping one opens it.
- [ ] **Empty start.** On a new account the Habits tab asks "What do you want to do regularly?" with **New habit** and **Start from a template**.

## 15. v1.4 step 3: several goals per habit, create a goal in the form (PR #5)
- [ ] **Placeholder.** Habits → New habit → the name field suggests "e.g. Read 20 min, Walk 8k steps". The goal row reads "Goal (optional) · No goal. Add one if this habit is for something bigger".
- [ ] **Pick several.** Tap the goal row → tick two goals → Done → the row lists both names. Save → on the Habits tab the habit appears under both goals.
- [ ] **Create inline.** In the goal sheet, type "Get promoted" → Add → it appears ticked in the list. Done → Save → Habits tab has a "Get promoted" group with this habit. Typing the name of a goal that already exists ticks that goal instead of making a duplicate.
- [ ] **Untick.** Edit the habit → goal row → untick one goal → Done → Save → it's gone from that goal's group only.
- [ ] **Habit details.** Open the habit → its goals show as small flag chips above the title; tapping one opens the goal. While a commitment that includes it is running, a "Commitment" card shows above them.

## 16. v1.4 step 4: one simple commitment (PR #5)
- [ ] **Make one.** Habits → **Make a commitment** → tick two habits → pick **30 days** → the quote reads like "For 30 days I'll walk every day and meditate 3× a week." → **I commit** → the commitment opens at Day 1 of 30.
- [ ] **New habit from there.** Make a commitment → **New habit** → fill it in → Save → you're back on Make a commitment with the new habit already ticked.
- [ ] **Until a date.** Make a commitment → **Until a date** → tap a day in the calendar → it's highlighted as the last day, and the quote says "For N days…" with the right count.
- [ ] **One at a time.** With one running, the Habits tab shows the "Current commitment" card instead of the button. Opening /commitment/new (e.g. from an old goal screen link) says "One commitment at a time" with **Open current commitment**.
- [ ] **Today line.** Today shows one tinted line under the week strip, "Day X of 30 · N% kept"; tapping it opens the commitment. The habits themselves appear in the normal Daily habits list (no separate commitment box).
- [ ] **Commitment screen.** It shows the quote, progress, habits, this week and **End early**. No pause, extend, edit, milestones or goal link. **Add a new habit to it** opens the habit form and returns to the commitment after Save.
- [ ] **End early.** Tap **End early** → "Looking back" with sessions done, time and rest days → pick **Done** → Confirm next step → Habits tab; the habits are still on Today tomorrow.
- [ ] **Renew / Change.** On the look-back screen: **Renew** starts the same habits again for the same length (tomorrow if the old one still covered today). **Change** opens Make a commitment with the same habits ticked, so you can adjust and commit again.
- [ ] **End date reached.** When the last day has passed, Today shows "<name> has reached its end date … Your habits keep going", and the commitment screen shows **See how it went**.

## 17. v1.4 step 5: monthly report (PR #5)
- [ ] **Entry.** Progress tab → near the top, a card "Your <last month> report" → tap → "Monthly report" for last month. **This month so far** on the same card opens the current month.
- [ ] **What went well first.** The report starts with "What went well": the best habit ("Walk went best: 18 of 20 (90%)"), sessions done and minutes, smaller versions ("Showing up still counts"), rest days, and "Up from N% last month" when it improved.
- [ ] **Success rate.** Below it: the overall %, "N of M planned sessions done", and the coloured breakdown bar.
- [ ] **Each habit.** Every habit with something planned is listed with its %, best first. Tap one → its progress screen.
- [ ] **One thing to adjust.** If a habit had at least 3 planned sessions and under half done, a card names it with a short suggestion and **Adjust this habit** (opens Edit habit).
- [ ] **Months.** The left arrow goes to earlier months; on the current month there's no right arrow. A quiet month says "Nothing logged yet in this period…".
- [ ] **Commitment look back uses it.** Commitment → End early (or See how it went) → the same "What went well / Success rate / Each habit" report appears, followed by Reflection and What comes next.
- [ ] **No milestones.** The Progress tab no longer has a "Milestones reached" section.

## 18. v1.4 step 6: why you missed (PR #5)
- [ ] **Note a reason.** Today → long-press a habit → **Skip** → in the reflection that follows pick "Not enough time" → Save. Do the same on another day (or another habit).
- [ ] **Progress card.** Progress tab (This week / Last 4 weeks / This month) → below the summary a "Why you missed" card reads e.g. "2 of 3 misses: not enough time." with an idea to try ("On full days, the minimum version still counts.").
- [ ] **Pattern.** If most misses were on evening habits, it adds "Mostly in the evening (N of M)." If most fell on one weekday, "Mostly on Mondays…".
- [ ] **No reasons yet.** With misses but no reasons noted, it says "N misses, no reason noted yet." and suggests tapping Reflect after a miss.
- [ ] **No misses.** With nothing missed in the range, the card doesn't appear.
- [ ] **In reports.** The monthly report and a commitment's look back show the same card above "One thing to adjust".
- [ ] **Today isn't a miss.** Something planned today and not yet logged isn't counted.

## 19. v1.4 step 7: simpler onboarding and templates (PR #5)
- [ ] **One question.** Sign up with a new account → the first screen is "What do you want to do regularly?" with **My own habit**, **Pick from templates**, **Create my first habit** and **Decide later**. No focus-area screen comes first.
- [ ] **First habit.** **Create my first habit** → fill in a name → Save → you land on Today with that habit; onboarding doesn't show again after reopening the app.
- [ ] **Template.** Welcome → **Pick from templates** → choose one → answer its questions, tick optional habits → "Is this for a bigger goal?" is ticked → **Add these N habits** → Today shows them from today; Habits tab groups them under the template's goal. No commitment was created.
- [ ] **Template without goal.** Same, but untick "Is this for a bigger goal?" → the habits are under **No goal**.
- [ ] **Templates list.** The cards show focus area and number of habits (no "30 days" length).
- [ ] **Old draft.** If you have a commitment draft from before, opening it still works; with another commitment running, **Start commitment** is disabled with "One commitment at a time" text.

## 20. v1.4: a goal and the signs it's achieved (PR #5)
- [ ] **New goal with signs.** Habits tab → **Add a goal** → type "Be healthy" → under "How will you know it's achieved?" type "Lost 9 kg" → **Add** → type "Eat healthy" → **Add** → type "Got flexible" (don't tap Add) → Continue → Skip → **Decide later** → Save goal → the goal page shows "Signs it's achieved" with all three signs, "0 of 3".
- [ ] **Remove before saving.** In the new-goal form, add a sign, then tap its **✕** → it's gone.
- [ ] **Tick and untick.** On the goal page tap "Lost 9 kg" → box ticked, "Since <today>" under it, count "1 of 3". Tap again → unticked, "0 of 3".
- [ ] **Last sign asks.** Tick all three → a sheet "All signs are there" asks to mark the goal achieved → **Not yet** → the goal stays Active. Untick one and tick it again → the sheet comes back → **Yes, I achieved it** → "You reached this goal" banner.
- [ ] **Achieve without all signs.** On another goal with signs not all ticked → **Mark as achieved** → the sheet says "N of M signs ticked. That's fine…" → Yes → achieved.
- [ ] **Add, rename, delete.** Goal page → **Add a sign** → type → Save → it appears. Tap **⋯** next to a sign → change the text → Save → renamed. **⋯** → **Delete sign** → gone.
- [ ] **Habits tab.** A goal with signs shows a "1 of 3 signs" pill next to its name (green when all are ticked); a goal without signs shows no pill.
- [ ] **Template signs.** Pick from templates → any template with "Is this for a bigger goal?" ticked → Add → open the goal → it has 3 suggested signs, all unticked. With the box unticked, no goal and no signs are created.

## 21. Goals tab, "+" button and "Let it go" (PR: goals-tab)
- [ ] **Bottom bar.** It reads Today · Habits · **+** · Goals · Progress. The + is a round button with no label.
- [ ] **+ sheet.** Tap **+** → a sheet "Add" with **New habit** and **New goal**. **New habit** → the habit form opens; back → you're where you were. **+** → **New goal** → the goal form opens.
- [ ] **Templates from the habit form.** **+** → **New habit** → under Build/Reduce tap **Or pick from templates** → the template list opens.
- [ ] **Goals tab.** Tap **Goals** → "Your goals", **Add a goal**, and one card per active goal with "N habits · X of Y signs · Z% last 4 weeks". Tap a card → its goal page.
- [ ] **Empty Goals tab.** On an account with no goals → "Got something bigger in mind?" with **Add a goal**.
- [ ] **Let it go, keep habits.** Goal page → **Let it go** → sheet "Let this goal go?" → leave "Also archive…" unticked → **Let it go** → banner "You let this goal go"; its habits still show on Today. Goals tab → **Let go (1)** → the goal is listed there.
- [ ] **Let it go, archive habits.** Make a goal with one habit only for it and one habit shared with another goal → **Let it go** → tick "Also archive its habit" (only the unshared habit is named) → **Let it go** → that habit is gone from Today and listed under Habits tab → **Archived habits**; the shared habit keeps going.
- [ ] **Bring it back.** Open a let-go goal → **Bring it back** → it's Active again and back in the Goals list.
- [ ] **Habits tab.** No "Add a goal" row and no goals list at the bottom any more; archived habits are under **Archived habits (N)**.
