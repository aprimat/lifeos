import { addDays, startOfWeek } from './dates';
import { habitBreakdown, consistency } from './analytics';
import { currentVersion, DataIndex, occurrence } from './schedule';
import type { AutomaticityRating, Habit, ISODate, Reflection, TimeOfDay } from './types';

/**
 * Rule-based suggestions (IMPLEMENTATION_PLAN.md §2.8).
 * Each suggestion cites its evidence and is only applied after the user accepts it.
 */

export type SuggestionRule = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type SuggestedChange =
  | { kind: 'target'; from: number; to: number; unit: string }
  | { kind: 'limit'; from: number; to: number; unit: string }
  | { kind: 'reminder'; time: string }
  | { kind: 'timeOfDay'; from: TimeOfDay; to: TimeOfDay }
  | { kind: 'pause'; days: number }
  | { kind: 'plan'; trigger: string };

export interface Suggestion {
  id: string;
  rule: SuggestionRule;
  habitId: string;
  habitTitle: string;
  title: string;
  body: string;
  evidence: string;
  change: SuggestedChange;
}

const WINDOW = 14;

const DEFAULT_REMINDER: Record<TimeOfDay, string> = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:30',
  anytime: '09:00',
};

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  anytime: 'any time',
};

export interface SuggestionInput {
  habits: Habit[];
  reflections: Reflection[];
  automaticity: AutomaticityRating[];
  idx: DataIndex;
  today: ISODate;
}

export function generateSuggestions(input: SuggestionInput): Suggestion[] {
  const { habits, reflections, automaticity, idx, today } = input;
  const start = addDays(today, -WINDOW);
  const end = addDays(today, -1);
  const week = startOfWeek(today);
  const out: Suggestion[] = [];

  for (const habit of habits) {
    if (habit.status !== 'active') continue;
    const v = currentVersion(habit);
    const refl = reflections.filter((r) => r.habitId === habit.id && r.date >= start && r.date <= end);
    const count = (o: string) => refl.filter((r) => r.obstacles.includes(o as never)).length;
    const id = (rule: SuggestionRule) => `${rule}:${habit.id}:${week}`;
    const base = { habitId: habit.id, habitTitle: habit.title };
    const b = habitBreakdown(habit, start, end, idx, today);

    // S3 — several misses/skips in a row → pause or plan rest (checked first; most supportive).
    let missesInRow = 0;
    for (let d = end; d >= start; d = addDays(d, -1)) {
      const o = occurrence(habit, d, idx, today);
      if (!o.eligible) continue;
      if (o.status === 'missed' || o.status === 'skipped' || o.status === 'notLogged') missesInRow++;
      else break;
    }
    if (missesInRow >= 3) {
      out.push({
        ...base,
        id: id('S3'),
        rule: 'S3',
        title: 'Take a short pause',
        body: `“${habit.title}” hasn't fit your days lately. A planned one-week pause keeps your history intact and gives you room to restart calmly.`,
        evidence: `${missesInRow} planned sessions in a row weren't logged.`,
        change: { kind: 'pause', days: 7 },
      });
      continue;
    }

    // S1 — time / forgetting → reminder or a different time of day.
    const timeOrForgot = count('time') + count('forgot');
    if (timeOrForgot >= 2) {
      if (!v.reminderTime) {
        out.push({
          ...base,
          id: id('S1'),
          rule: 'S1',
          title: 'Add a gentle reminder',
          body: `A reminder at ${DEFAULT_REMINDER[v.timeOfDay]} could help “${habit.title}” find its moment.`,
          evidence: `“Not enough time” or “Forgot” was noted ${timeOrForgot} times in two weeks.`,
          change: { kind: 'reminder', time: DEFAULT_REMINDER[v.timeOfDay] },
        });
      } else {
        const to: TimeOfDay = v.timeOfDay === 'morning' ? 'evening' : 'morning';
        out.push({
          ...base,
          id: id('S1'),
          rule: 'S1',
          title: `Try the ${TIME_LABEL[to]}`,
          body: `Moving “${habit.title}” from the ${TIME_LABEL[v.timeOfDay]} to the ${TIME_LABEL[to]} might fit your days better.`,
          evidence: `“Not enough time” or “Forgot” was noted ${timeOrForgot} times in two weeks.`,
          change: { kind: 'timeOfDay', from: v.timeOfDay, to },
        });
      }
    }

    // S2 — low energy / too difficult / mostly minimum → smaller target.
    const hard = count('lowEnergy') + count('difficult');
    const completions = b.full + b.minimum + b.partial;
    const mostlyMinimum = completions >= 4 && b.minimum / completions > 0.5;
    if (habit.kind === 'build' && v.build && v.build.target > 1 && (hard >= 2 || mostlyMinimum)) {
      const to = Math.max(1, Math.round(v.build.target / 2));
      out.push({
        ...base,
        id: id('S2'),
        rule: 'S2',
        title: 'Make it lighter',
        body: `Shortening “${habit.title}” from ${v.build.target} to ${to} ${v.build.unit} keeps the habit going on heavy days.`,
        evidence: mostlyMinimum
          ? `${b.minimum} of ${completions} sessions were the minimum version.`
          : `“Low energy” or “Too difficult” was noted ${hard} times in two weeks.`,
        change: { kind: 'target', from: v.build.target, to, unit: v.build.unit },
      });
    }

    // S4 — steady and feels easy → optional extra challenge.
    const c = consistency(b);
    const ratings = automaticity.filter((a) => a.habitId === habit.id).sort((x, y) => x.date.localeCompare(y.date));
    const latest = ratings[ratings.length - 1];
    if (
      habit.kind === 'build' &&
      v.build &&
      v.build.trackingType !== 'check' &&
      c !== null &&
      c >= 0.9 &&
      b.eligible >= 6 &&
      (!latest || latest.score >= 7) &&
      hard === 0
    ) {
      const step = v.build.trackingType === 'duration' ? 5 : 1;
      const to = Math.max(v.build.target + step, Math.round(v.build.target * 1.25));
      out.push({
        ...base,
        id: id('S4'),
        rule: 'S4',
        title: 'Optional: a little more',
        body: `“${habit.title}” has been steady. If it feels right, you could grow it from ${v.build.target} to ${to} ${v.build.unit}. Staying as you are is a good choice too.`,
        evidence: `${b.done} of ${b.eligible} sessions done in the last two weeks${latest ? `, and it feels ${latest.score}/10 natural` : ''}.`,
        change: { kind: 'target', from: v.build.target, to, unit: v.build.unit },
      });
    }

    // S5 — taper step when consistently at or below the current limit (never for sensitive behaviours).
    if (habit.kind === 'reduce' && v.reduce && v.reduce.mode === 'taper' && !v.reduce.sensitive) {
      const finalTarget = v.reduce.finalTarget ?? 0;
      const logs = [...(idx.logsByHabit.get(habit.id) ?? new Map()).values()].filter(
        (l) => l.date >= start && l.date <= end,
      );
      const avg = logs.length ? logs.reduce((a, l) => a + (l.value ?? 0), 0) / logs.length : null;
      if (logs.length >= 10 && avg !== null && avg <= v.reduce.limit && v.reduce.limit > finalTarget) {
        const to = Math.max(finalTarget, Math.min(v.reduce.limit - 1, Math.round(v.reduce.limit * 0.85)));
        out.push({
          ...base,
          id: id('S5'),
          rule: 'S5',
          title: 'Ready for the next step?',
          body: `You've stayed around your limit for two weeks. The next step would lower it from ${v.reduce.limit} to ${to} ${v.reduce.unit}.`,
          evidence: `Average of ${Math.round(avg)} ${v.reduce.unit} per day over ${logs.length} logged days.`,
          change: { kind: 'limit', from: v.reduce.limit, to, unit: v.reduce.unit },
        });
      }
    }

    // S6 — the same trigger keeps appearing → plan an alternative response.
    const triggerCounts = new Map<string, number>();
    for (const r of refl) for (const t of r.triggers) triggerCounts.set(t, (triggerCounts.get(t) ?? 0) + 1);
    const top = [...triggerCounts.entries()].sort((a, b2) => b2[1] - a[1])[0];
    if (top && top[1] >= 3) {
      out.push({
        ...base,
        id: id('S6'),
        rule: 'S6',
        title: 'Plan for a familiar moment',
        body: `“${top[0]}” came up often. Deciding ahead — “If ${top[0].toLowerCase()}, then I will…” — can make that moment easier.`,
        evidence: `“${top[0]}” was noted ${top[1]} times in two weeks.`,
        change: { kind: 'plan', trigger: top[0] },
      });
    }
  }
  return out;
}
