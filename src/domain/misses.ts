import { addDays, eachDay, minDate, weekdayIndex } from './dates';
import { occurrence, type DataIndex } from './schedule';
import type { Habit, ID, ISODate, Obstacle, Reflection, TimeOfDay } from './types';

/**
 * "Why you missed" (plan v1.4 §6): sums up the reasons people noted after a miss,
 * and the time-of-day or weekday where misses cluster. Uses saved data only.
 */

export interface MissSummary {
  /** Skipped, missed, not logged, or over the limit (past days only). */
  misses: number;
  /** Misses with at least one reason noted. */
  withReason: number;
  reasons: { obstacle: Obstacle; count: number }[];
  /** Where misses cluster: at least 3 misses and 60% of them in one time of day (not "anytime"). */
  timeOfDay: { value: TimeOfDay; count: number } | null;
  /** At least 3 misses and 40% of them on one weekday. */
  weekday: { index: number; count: number } | null;
  /** Habits with the most misses, most first. */
  byHabit: { habit: Habit; misses: number }[];
}

const MISS = new Set(['missed', 'skipped', 'notLogged', 'over']);

export function missSummary(
  habits: Habit[],
  reflections: Reflection[],
  start: ISODate,
  end: ISODate,
  idx: DataIndex,
  today: ISODate,
): MissSummary {
  const last = minDate(end, addDays(today, -1)); // today is still open
  const reasonsBy = new Map<string, Obstacle[]>();
  for (const r of reflections) if (r.obstacles.length) reasonsBy.set(`${r.habitId}:${r.date}`, r.obstacles);

  let misses = 0;
  let withReason = 0;
  const reasons = new Map<Obstacle, number>();
  const tod = new Map<TimeOfDay, number>();
  const wd = new Map<number, number>();
  const perHabit = new Map<ID, number>();
  const days = start <= last ? eachDay(start, last) : [];

  for (const h of habits) {
    for (const d of days) {
      const o = occurrence(h, d, idx, today);
      if (!MISS.has(o.status)) continue;
      misses++;
      perHabit.set(h.id, (perHabit.get(h.id) ?? 0) + 1);
      tod.set(o.version.timeOfDay, (tod.get(o.version.timeOfDay) ?? 0) + 1);
      wd.set(weekdayIndex(d), (wd.get(weekdayIndex(d)) ?? 0) + 1);
      const rs = reasonsBy.get(`${h.id}:${d}`);
      if (rs) {
        withReason++;
        for (const ob of new Set(rs)) reasons.set(ob, (reasons.get(ob) ?? 0) + 1);
      }
    }
  }

  const top = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const t = top(new Map([...tod].filter(([k]) => k !== 'anytime')));
  const w = top(wd);
  return {
    misses,
    withReason,
    reasons: [...reasons.entries()].map(([obstacle, count]) => ({ obstacle, count })).sort((a, b) => b.count - a.count),
    timeOfDay: t && misses >= 3 && t[1] / misses >= 0.6 ? { value: t[0], count: t[1] } : null,
    weekday: w && misses >= 3 && w[1] / misses >= 0.4 ? { index: w[0], count: w[1] } : null,
    byHabit: habits
      .filter((h) => perHabit.has(h.id))
      .map((h) => ({ habit: h, misses: perHabit.get(h.id)! }))
      .sort((a, b) => b.misses - a.misses),
  };
}
