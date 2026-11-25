# Deferred work

Work that's agreed in principle but put on hold. Each item keeps what was decided so far.

## Time spent on a goal
**Status:** deferred, 2026-11-24. The owner wants to review the UI first and make suggestions.

**Idea:** a goal page shows how much time went into the goal, summed from the habits that support it.

**Agreed so far (from the discussion):**
- Time is the sum of minutes logged on the goal's habits, using duration-tracked habits only.
- A habit linked to several goals counts fully toward each one. Because of that, totals are never added up across goals.
- Habits without minutes (counts, checks, reduce) still count as sessions, so the goal shows something like "12 h 30 min · 48 sessions".
- A habit's whole history counts, including days before it was linked to the goal.
- Later, the minutes of one-off Steps will be added to the total too.

**Open, waiting on the UI review:** where it's shown (goal page, Goals tab card, or both), what period it covers (all time, or this month too), and how it looks.

## One-off Steps for a goal
**Status:** agreed, not started.

**Agreed so far:**
- A step belongs to exactly one goal.
- It has a title, an optional date, and an optional "time spent" when you tick it done.
- It shows on Today only on its date.
- It never repeats; for something repeating, the app offers "Make this a habit".
- No reminders at first.
- Its minutes add to the goal's time.
- The goal page keeps Signs, Habits and Steps visually distinct.

## Commitments
**Status:** hidden, 2026-11-24. The owner wants to understand how commitments should work before showing them again.

**Where it's hidden:** a single switch, `FEATURES.commitments` in `src/features.ts`. The data and screens are kept and only the ways in are hidden: the Today line and its end-of-commitment prompt, the Habits tab button and card, the card on a habit's page, the Progress section, and the new-goal form option. Habits that belong to a commitment keep working as normal.

**To decide:** what a commitment is for, now that habits run on their own; whether it stays at all; and how it would show on Today.

## Choosing the order of habits on Today
**Status:** deferred, 2026-11-24.

Today now shows one list without Morning/Afternoon/Evening titles. Under the hood it's still in time-of-day order, with completed habits moved to the bottom. The owner wants users to decide the order themselves, for example by dragging; how is still to be discussed.

## Questions to discuss later

**Time spent on a goal**
1. Where is it shown: the goal page, the Goals tab card, or both?
2. What period: all time only, or also "this month" / "last 4 weeks"?
3. How does it look: one line ("12 h 30 min · 48 sessions"), or a small breakdown per habit?

**Steps**

4. Is the + sheet's third row "New step"? If so, it first has to ask which goal the step is for.
5. Does a dated step that wasn't done carry over to the next day on Today, or stay on its date as "not done"?
6. Do done steps count in the reports (monthly report, "What went well"), or only on the goal page?
7. Can you tick a step done without a date, straight from the goal page?

**Goals and signs**

8. Should a sign link to a habit or step (e.g. "Lost 9 kg" ↔ "Walk 8k steps"), or stay plain text?
9. The new-goal form's last step still offers "Start a commitment". Keep it, or offer "Add a habit" first?

**Leftovers from v1.4**

10. Focus-area screen: onboarding no longer shows it. Remove it, or keep it for later?
11. Old draft commitments still open and can be started. Keep that, or turn old drafts into normal habits?
12. `LifeOS_App_Plan_v1.3.md` sits untracked in the project folder. Commit it as history, or delete it?
13. Settings → Version: does it show "Update of …" on your phone? Never confirmed.
