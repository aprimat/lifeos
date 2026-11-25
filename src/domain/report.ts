import { addBreakdown, consistency, emptyBreakdown, habitBreakdown, minutesInRange, type Breakdown } from './analytics';
import { minDate } from './dates';
import type { DataIndex } from './schedule';
import type { Habit, ISODate } from './types';

/**
 * One report for any period (plan v1.4 §6): a week, a month, or a commitment.
 * It leads with what went well, then offers one thing to adjust.
 */

export interface HabitResult {
  habit: Habit;
  breakdown: Breakdown;
  consistency: number | null;
}

export interface PeriodReport {
  start: ISODate;
  /** Last day counted (the period's end, or today if it's still running). */
  end: ISODate;
  breakdown: Breakdown;
  consistency: number | null;
  minutes: number;
  /** Habits with something planned or logged, best first. */
  habits: HabitResult[];
  /** The habit that went best (at least 3 planned sessions, at least half done). */
  best: HabitResult | null;
  /** The one habit worth adjusting (at least 3 planned sessions, under half done). */
  adjust: HabitResult | null;
  /** Consistency over the comparison period, if one was given and had anything planned. */
  previousConsistency: number | null;
}

const MIN_SESSIONS = 3;

function results(habits: Habit[], start: ISODate, end: ISODate, idx: DataIndex, today: ISODate, trailing: boolean): HabitResult[] {
  return habits
    .map((habit) => {
      const breakdown = habitBreakdown(habit, start, end, idx, today, trailing);
      return { habit, breakdown, consistency: consistency(breakdown) };
    })
    .filter((r) => r.breakdown.eligible > 0 || r.breakdown.extra > 0 || r.breakdown.done > 0);
}

export function periodReport(
  habits: Habit[],
  start: ISODate,
  periodEnd: ISODate,
  idx: DataIndex,
  today: ISODate,
  opts: { compareTo?: { start: ISODate; end: ISODate }; includeTrailingWeek?: boolean } = {},
): PeriodReport {
  const end = minDate(periodEnd, today);
  const trailing = opts.includeTrailingWeek ?? false;
  const list = results(habits, start, end, idx, today, trailing).sort(
    (a, b) => (b.consistency ?? -1) - (a.consistency ?? -1) || b.breakdown.done - a.breakdown.done,
  );
  const breakdown = list.reduce((acc, r) => addBreakdown(acc, r.breakdown), emptyBreakdown());
  const measured = list.filter((r) => r.breakdown.eligible >= MIN_SESSIONS && r.consistency !== null);
  const best = measured.find((r) => (r.consistency ?? 0) >= 0.5) ?? null;
  const weakest = [...measured].reverse().find((r) => (r.consistency ?? 1) < 0.5) ?? null;
  const adjust = weakest && weakest !== best ? weakest : null;

  let previousConsistency: number | null = null;
  if (opts.compareTo) {
    const prev = results(habits, opts.compareTo.start, minDate(opts.compareTo.end, today), idx, today, trailing);
    previousConsistency = consistency(prev.reduce((acc, r) => addBreakdown(acc, r.breakdown), emptyBreakdown()));
  }

  return {
    start,
    end,
    breakdown,
    consistency: consistency(breakdown),
    minutes: minutesInRange(habits, start, end, idx),
    habits: list,
    best,
    adjust,
    previousConsistency,
  };
}
