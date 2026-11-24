import { addDays, diffDays, eachDay, endOfWeek, maxDate, minDate, startOfWeek } from './dates';
import {
  commitmentDay,
  commitmentEndDate,
  DataIndex,
  DayStatus,
  exceptionFor,
  getLog,
  isHabitActiveOn,
  logAmount,
  occurrence,
  Occurrence,
  versionOn,
} from './schedule';
import type { Commitment, Habit, ISODate, Milestone } from './types';

/**
 * Progress rules (IMPLEMENTATION_PLAN.md §2.2–2.6).
 * Consistency = done ÷ eligible opportunities. Never a "life score". No streaks.
 */

export interface Breakdown {
  eligible: number;
  done: number;
  full: number;
  minimum: number;
  partial: number;
  skipped: number;
  missed: number;
  within: number;
  over: number;
  notLogged: number;
  rest: number;
  rescheduled: number;
  extra: number;
}

export const emptyBreakdown = (): Breakdown => ({
  eligible: 0,
  done: 0,
  full: 0,
  minimum: 0,
  partial: 0,
  skipped: 0,
  missed: 0,
  within: 0,
  over: 0,
  notLogged: 0,
  rest: 0,
  rescheduled: 0,
  extra: 0,
});

export function addBreakdown(a: Breakdown, b: Breakdown): Breakdown {
  const out = emptyBreakdown();
  (Object.keys(out) as (keyof Breakdown)[]).forEach((k) => (out[k] = a[k] + b[k]));
  return out;
}

/** 0–1, or null when there were no eligible opportunities (show "—", never 0%). */
export function consistency(b: Breakdown): number | null {
  return b.eligible === 0 ? null : b.done / b.eligible;
}

export function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function countStatus(b: Breakdown, o: Occurrence) {
  if (o.status === 'rest') b.rest++;
  if (o.status === 'rescheduled') b.rescheduled++;
  if (!o.eligible) return;
  b.eligible++;
  if (o.done) b.done++;
  const k = o.status as DayStatus;
  if (k === 'full' || k === 'minimum' || k === 'partial' || k === 'skipped' || k === 'missed' || k === 'within' || k === 'over' || k === 'notLogged') {
    b[k]++;
  }
}

// ---------- Flexible weekly habits (§2.3) ----------

export interface FlexWeek {
  weekStart: ISODate;
  weekEnd: ISODate;
  timesPerWeek: number;
  /** min(N, days available this week). */
  target: number;
  done: number;
  extra: number;
  ended: boolean;
  missed: number;
  breakdown: Breakdown;
}

export function flexWeek(habit: Habit, anyDate: ISODate, idx: DataIndex, today: ISODate): FlexWeek {
  const weekStart = startOfWeek(anyDate);
  const weekEnd = endOfWeek(anyDate);
  const days = eachDay(weekStart, weekEnd);
  const activeDays = days.filter(
    (d) => isHabitActiveOn(habit, d, idx) && versionOn(habit, d).schedule.type === 'flexWeekly',
  );
  const available = activeDays.filter((d) => !exceptionFor(habit, d, idx));
  const lastDay = activeDays[activeDays.length - 1] ?? weekEnd;
  const schedule = versionOn(habit, lastDay).schedule;
  const timesPerWeek = schedule.type === 'flexWeekly' ? schedule.timesPerWeek : 0;
  const target = activeDays.length === 0 ? 0 : Math.min(timesPerWeek, available.length);

  const b = emptyBreakdown();
  let logged = 0;
  for (const d of activeDays) {
    const log = getLog(idx, habit.id, d);
    if (!log) continue;
    if (log.status === 'full') b.full++;
    else if (log.status === 'minimum') b.minimum++;
    else if (log.status === 'partial') b.partial++;
    else if (log.status === 'skipped') b.skipped++;
    if (log.status === 'full' || log.status === 'minimum' || log.status === 'partial' || log.status === 'logged') logged++;
  }
  const done = Math.min(logged, target);
  const extra = Math.max(0, logged - target);
  const ended = weekEnd < today;
  const missed = ended ? target - done : 0;
  b.done = done;
  b.extra = extra;
  b.missed = missed;
  // Until the week ends, only completed sessions count — unmet ones are not "missed" yet.
  b.eligible = ended ? target : done;
  b.rest = activeDays.length - available.length;
  return { weekStart, weekEnd, timesPerWeek, target, done, extra, ended, missed, breakdown: b };
}

// ---------- Ranges ----------

/** Breakdown for one habit over [start, end] (inclusive). Future days never count. */
export function habitBreakdown(
  habit: Habit,
  start: ISODate,
  end: ISODate,
  idx: DataIndex,
  today: ISODate,
  /** Also count a flexible week that starts inside the range but ends after it (a commitment's final week). */
  includeTrailingWeek = false,
): Breakdown {
  const b = emptyBreakdown();
  const last = minDate(end, today);
  if (start > last) return b;

  // Daily-scheduled part
  for (const d of eachDay(maxDate(start, habit.startDate), last)) {
    const v = versionOn(habit, d);
    if (v.schedule.type === 'flexWeekly') continue;
    countStatus(b, occurrence(habit, d, idx, today));
  }

  // Flexible part — weeks are attributed to the range their last day falls in,
  // plus the current week while it is in progress.
  let total = b;
  let ws = startOfWeek(maxDate(start, habit.startDate));
  while (ws <= last) {
    const we = addDays(ws, 6);
    const attributed =
      (we >= start && we <= end) ||
      (ws <= today && today <= we && today >= start && today <= end) ||
      (includeTrailingWeek && ws <= end && we > end);
    const anyFlex = eachDay(ws, we).some((d) => d >= habit.startDate && versionOn(habit, d).schedule.type === 'flexWeekly');
    if (attributed && anyFlex) {
      total = addBreakdown(total, flexWeek(habit, ws, idx, today).breakdown);
    }
    ws = addDays(ws, 7);
  }
  return total;
}

export function habitsBreakdown(
  habits: Habit[],
  start: ISODate,
  end: ISODate,
  idx: DataIndex,
  today: ISODate,
  includeTrailingWeek = false,
): Breakdown {
  return habits.reduce((acc, h) => addBreakdown(acc, habitBreakdown(h, start, end, idx, today, includeTrailingWeek)), emptyBreakdown());
}

/** Planned opportunities for a single day (non-flexible, not rest). */
export function dayPlan(habits: Habit[], date: ISODate, idx: DataIndex, today: ISODate): Occurrence[] {
  return habits
    .map((h) => occurrence(h, date, idx, today))
    .filter((o) => o.planned);
}

/** Daily plan completion (§2.5): "3 of 5". Flexible habits are excluded from the denominator. */
export function dailyCompletion(habits: Habit[], date: ISODate, idx: DataIndex, today: ISODate) {
  const plan = dayPlan(habits, date, idx, today);
  const done = plan.filter((o) => o.done).length;
  return { done, total: plan.length, ratio: plan.length === 0 ? null : done / plan.length };
}

/** Flexible habits still open this week, or logged on this date. */
export function flexibleForDay(habits: Habit[], date: ISODate, idx: DataIndex, today: ISODate) {
  return habits
    .filter((h) => isHabitActiveOn(h, date, idx) && versionOn(h, date).schedule.type === 'flexWeekly')
    .map((h) => ({ habit: h, week: flexWeek(h, date, idx, today), log: getLog(idx, h.id, date) }))
    .filter((x) => x.week.target > 0 && (x.week.done < x.week.target || !!x.log));
}

// ---------- Commitments (§2.6) ----------

export interface CommitmentProgress {
  day: number;
  totalDays: number | null;
  daysRemaining: number | null;
  endDate: ISODate | null;
  breakdown: Breakdown;
  consistency: number | null;
  plannedTotal: number | null;
  plannedSoFar: number;
  minutes: number;
  timeRatio: number | null;
}

export function commitmentHabits(c: Commitment, habits: Habit[]): Habit[] {
  return habits.filter((h) => h.commitmentId === c.id);
}

export function commitmentProgress(
  c: Commitment,
  habits: Habit[],
  idx: DataIndex,
  today: ISODate,
): CommitmentProgress {
  const hs = commitmentHabits(c, habits);
  const endDate = commitmentEndDate(c);
  const day = commitmentDay(c, today);
  const last = endDate ? minDate(endDate, today) : today;
  const breakdown = habitsBreakdown(hs, c.startDate, last, idx, today, true);

  let plannedTotal: number | null = null;
  if (endDate) {
    plannedTotal = 0;
    for (const h of hs) {
      for (const d of eachDay(c.startDate, endDate)) {
        const v = versionOn(h, d);
        if (v.schedule.type === 'flexWeekly') continue;
        // Count future dates too: is it scheduled and not a planned exception?
        const o = occurrence(h, d, idx, '9999-12-31');
        if (o.planned) plannedTotal++;
      }
      let ws = startOfWeek(c.startDate);
      while (ws <= endDate) {
        if (eachDay(ws, addDays(ws, 6)).some((d) => d >= h.startDate && versionOn(h, d).schedule.type === 'flexWeekly')) {
          plannedTotal += flexWeek(h, ws, idx, '0000-01-01').target;
        }
        ws = addDays(ws, 7);
      }
    }
  }

  let minutes = 0;
  for (const h of hs) {
    for (const [date, log] of idx.logsByHabit.get(h.id) ?? []) {
      if (date < c.startDate || date > last) continue;
      const v = versionOn(h, date);
      if (v.build?.trackingType === 'duration') minutes += logAmount(v.build, log);
    }
  }

  const totalDays = c.durationDays;
  return {
    day,
    totalDays,
    daysRemaining: endDate ? Math.max(0, diffDays(today, endDate)) : null,
    endDate,
    breakdown,
    consistency: consistency(breakdown),
    plannedTotal,
    plannedSoFar: breakdown.eligible,
    minutes,
    timeRatio: totalDays ? Math.min(1, day / totalDays) : null,
  };
}

// ---------- Reduction (§2.4) ----------

export interface ReduceTrend {
  series: { date: ISODate; value: number | null; within: boolean | null }[];
  average: number | null;
  baseline: number | null;
  /** Fractional change vs baseline (negative = reduced). */
  changeVsBaseline: number | null;
  limit: number;
  loggedDays: number;
}

export function reduceTrend(habit: Habit, end: ISODate, days: number, idx: DataIndex): ReduceTrend {
  const v = versionOn(habit, end);
  const limit = v.reduce?.limit ?? 0;
  const baseline = v.reduce?.baseline ?? null;
  const series = eachDay(addDays(end, -(days - 1)), end).map((d) => {
    const log = getLog(idx, habit.id, d);
    if (!log || d < habit.startDate) return { date: d, value: null, within: null };
    const value = log.value ?? 0;
    return { date: d, value, within: value <= (versionOn(habit, d).reduce?.limit ?? 0) };
  });
  const logged = series.filter((s) => s.value !== null) as { value: number }[];
  const average = logged.length ? logged.reduce((a, s) => a + s.value, 0) / logged.length : null;
  const changeVsBaseline =
    average !== null && baseline ? (average - baseline) / baseline : null;
  return { series, average, baseline, changeVsBaseline, limit, loggedDays: logged.length };
}

// ---------- Totals ----------

export function minutesInRange(habits: Habit[], start: ISODate, end: ISODate, idx: DataIndex): number {
  let total = 0;
  for (const h of habits) {
    if (h.kind !== 'build') continue;
    for (const [date, log] of idx.logsByHabit.get(h.id) ?? []) {
      if (date < start || date > end) continue;
      const v = versionOn(h, date);
      if (v.build?.trackingType === 'duration' && log.status !== 'skipped' && log.status !== 'rescheduled') {
        total += logAmount(v.build, log);
      }
    }
  }
  return total;
}

/** Per-day completion ratio for a strip / bar chart. */
export function dailySeries(habits: Habit[], start: ISODate, end: ISODate, idx: DataIndex, today: ISODate) {
  return eachDay(start, end).map((d) => {
    const occs = habits.map((h) => occurrence(h, d, idx, today));
    const planned = occs.filter((o) => o.planned).length;
    const done = occs.filter((o) => o.done).length;
    const rest = occs.some((o) => o.status === 'rest') && planned === 0;
    return { date: d, planned, done, rest, future: d > today };
  });
}

// ---------- Milestones ----------

/**
 * Session-based commitment milestones that are now reached but not yet recorded.
 * `date` is the day the Nth completed session happened (not the day it was noticed).
 */
export function newlyReachedMilestones(
  milestones: Milestone[],
  commitments: Commitment[],
  habits: Habit[],
  idx: DataIndex,
  today: ISODate,
): { id: string; date: ISODate }[] {
  const out: { id: string; date: ISODate }[] = [];
  for (const c of commitments) {
    const pending = milestones
      .filter((m) => m.ownerType === 'commitment' && m.ownerId === c.id && m.targetSessions && !m.achievedAt)
      .sort((a, b) => (a.targetSessions ?? 0) - (b.targetSessions ?? 0));
    if (!pending.length || c.status === 'draft') continue;
    const hs = commitmentHabits(c, habits);
    const end = commitmentEndDate(c);
    const last = end ? minDate(end, today) : today;
    let count = 0;
    let i = 0;
    for (const d of eachDay(c.startDate, last)) {
      for (const h of hs) {
        const log = getLog(idx, h.id, d);
        if (!log || !isHabitActiveOn(h, d, idx)) continue;
        const done = h.kind === 'reduce' ? (log.value ?? 0) <= (versionOn(h, d).reduce?.limit ?? 0) : log.status === 'full' || log.status === 'minimum' || log.status === 'partial';
        if (done) count++;
      }
      while (i < pending.length && count >= (pending[i].targetSessions ?? Infinity)) {
        out.push({ id: pending[i].id, date: d });
        i++;
      }
      if (i >= pending.length) break;
    }
  }
  return out;
}
