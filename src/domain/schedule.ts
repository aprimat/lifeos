import { addDays, diffDays, inRange, minDate, weekdayIndex } from './dates';
import type {
  ActivityLog,
  BuildConfig,
  Commitment,
  Habit,
  HabitVersion,
  ID,
  ISODate,
  ReduceConfig,
  Schedule,
  ScheduleException,
  UserData,
} from './types';

/**
 * Scheduling rules (IMPLEMENTATION_PLAN.md §2.1).
 * Pure functions — no I/O, no clock access except the `today` argument.
 */

export interface DataIndex {
  habitsById: Map<ID, Habit>;
  commitmentsById: Map<ID, Commitment>;
  logsByHabit: Map<ID, Map<ISODate, ActivityLog>>;
  /** habitId → dates that received a rescheduled session. */
  rescheduledInto: Map<ID, Set<ISODate>>;
  /** habitId → ids of the commitments that cover it (any status). */
  commitmentsByHabit: Map<ID, Set<ID>>;
  /** Habits set up inside a draft commitment that hasn't started: hidden until it does. */
  draftHabits: Set<ID>;
  exceptions: ScheduleException[];
}

export function buildIndex(
  data: Pick<UserData, 'habits' | 'commitments' | 'logs' | 'exceptions'>,
): DataIndex {
  const habitsById = new Map(data.habits.map((h) => [h.id, h]));
  const commitmentsById = new Map(data.commitments.map((c) => [c.id, c]));
  const logsByHabit = new Map<ID, Map<ISODate, ActivityLog>>();
  const rescheduledInto = new Map<ID, Set<ISODate>>();
  for (const log of data.logs) {
    let m = logsByHabit.get(log.habitId);
    if (!m) logsByHabit.set(log.habitId, (m = new Map()));
    m.set(log.date, log);
    if (log.status === 'rescheduled' && log.rescheduledTo) {
      let s = rescheduledInto.get(log.habitId);
      if (!s) rescheduledInto.set(log.habitId, (s = new Set()));
      s.add(log.rescheduledTo);
    }
  }
  const commitmentsByHabit = new Map<ID, Set<ID>>();
  const draftHabits = new Set<ID>();
  for (const c of data.commitments) {
    for (const hid of c.habitIds) {
      let s = commitmentsByHabit.get(hid);
      if (!s) commitmentsByHabit.set(hid, (s = new Set()));
      s.add(c.id);
      const h = habitsById.get(hid);
      if (c.status === 'draft' && h && isDraftsOwnHabit(c, h)) draftHabits.add(hid);
    }
  }
  return { habitsById, commitmentsById, logsByHabit, rescheduledInto, commitmentsByHabit, draftHabits, exceptions: data.exceptions };
}

/** A habit set up while creating a draft (as opposed to an existing habit the draft points at). */
export function isDraftsOwnHabit(c: Commitment, h: Habit): boolean {
  return c.habitIds.includes(h.id) && h.createdAt >= c.createdAt;
}

export function getLog(idx: DataIndex, habitId: ID, date: ISODate): ActivityLog | undefined {
  return idx.logsByHabit.get(habitId)?.get(date);
}

/** The version of a habit that applied on `date` (edits never rewrite the past). */
export function versionOn(habit: Habit, date: ISODate): HabitVersion {
  let found = habit.versions[0];
  for (const v of habit.versions) {
    if (v.effectiveFrom <= date) found = v;
    else break;
  }
  return found;
}

/** Is the habit inside a pause range on this date? */
export function isPausedOn(habit: Habit, date: ISODate): boolean {
  return habit.status !== 'archived' && inAnyRange(date, habit.pauses);
}

export function currentVersion(habit: Habit): HabitVersion {
  return habit.versions[habit.versions.length - 1];
}

export function commitmentEndDate(c: Commitment): ISODate | null {
  const planned = c.durationDays ? addDays(c.startDate, c.durationDays - 1) : null;
  if (c.endedAt) return planned ? minDate(planned, c.endedAt) : c.endedAt;
  return planned;
}

/** Day number within a commitment (1-based), clamped to its length. */
export function commitmentDay(c: Commitment, today: ISODate): number {
  const n = diffDays(c.startDate, today) + 1;
  if (n < 1) return 0;
  return c.durationDays ? Math.min(n, c.durationDays) : n;
}

function inAnyRange(date: ISODate, ranges: { start: ISODate; end: ISODate | null }[]): boolean {
  return ranges.some((r) => inRange(date, r.start, r.end));
}

/**
 * Is the habit "live" on this date (started, not archived or paused)? A commitment never
 * stops a habit; only a draft one that hasn't started yet keeps its new habits hidden.
 */
export function isHabitActiveOn(habit: Habit, date: ISODate, idx: DataIndex): boolean {
  if (date < habit.startDate) return false;
  if (habit.archivedAt && date > habit.archivedAt) return false;
  if (inAnyRange(date, habit.pauses)) return false;
  if (idx.draftHabits.has(habit.id)) return false;
  return true;
}

/** The commitment running now (active or paused, not past its end) — at most one. */
export function runningCommitment(commitments: Commitment[], today: ISODate): Commitment | undefined {
  return commitments.find((c) => {
    if (c.status !== 'active' && c.status !== 'paused') return false;
    const end = commitmentEndDate(c);
    return !end || end >= today;
  });
}

export function exceptionFor(
  habit: Habit,
  date: ISODate,
  idx: DataIndex,
): ScheduleException | undefined {
  return idx.exceptions.find(
    (e) =>
      date >= e.start &&
      date <= e.end &&
      ((e.habitId === null && e.commitmentId === null) ||
        e.habitId === habit.id ||
        (e.commitmentId !== null && !!idx.commitmentsByHabit.get(habit.id)?.has(e.commitmentId))),
  );
}

export function scheduleMatches(schedule: Schedule, date: ISODate): boolean {
  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return schedule.weekdays.includes(weekdayIndex(date));
    case 'dates':
      return schedule.dates.includes(date);
    case 'flexWeekly':
      return false;
  }
}

export function isFlexible(habit: Habit, date?: ISODate): boolean {
  const v = date ? versionOn(habit, date) : currentVersion(habit);
  return v.schedule.type === 'flexWeekly';
}

export type DayStatus =
  | 'none' // not scheduled / not active
  | 'rest' // planned rest, exception, pause-free rest day
  | 'upcoming' // today (not yet logged) or future
  | 'full'
  | 'minimum'
  | 'partial'
  | 'skipped'
  | 'rescheduled'
  | 'missed'
  | 'within' // reduce: within limit
  | 'over' // reduce: over limit (a lapse — neutral wording in UI)
  | 'notLogged'; // reduce: past day without a log

export interface Occurrence {
  habit: Habit;
  date: ISODate;
  version: HabitVersion;
  status: DayStatus;
  /** Counts as an opportunity for consistency. */
  eligible: boolean;
  /** Counts as done (full/minimum/partial, or within limit). */
  done: boolean;
  /** Appears on the plan for this date (scheduled or rescheduled into it, not rest). */
  planned: boolean;
  log?: ActivityLog;
}

export const DONE_STATUSES: DayStatus[] = ['full', 'minimum', 'partial', 'within'];

function statusFromLog(habit: Habit, version: HabitVersion, log: ActivityLog): DayStatus {
  if (habit.kind === 'reduce') {
    const limit = version.reduce?.limit ?? 0;
    return (log.value ?? 0) <= limit ? 'within' : 'over';
  }
  if (log.status === 'logged') return 'full';
  return log.status as DayStatus;
}

/**
 * Can a session be moved onto `target`? Only onto a free day: the habit is live there,
 * it isn't already scheduled, moved-into, logged or a planned rest day. Otherwise the
 * moved session would merge into the existing one and quietly disappear.
 */
export function canRescheduleTo(habit: Habit, target: ISODate, idx: DataIndex): boolean {
  if (!isHabitActiveOn(habit, target, idx)) return false;
  if (exceptionFor(habit, target, idx)) return false;
  if (getLog(idx, habit.id, target)) return false;
  if (idx.rescheduledInto.get(habit.id)?.has(target)) return false;
  const version = versionOn(habit, target);
  return version.schedule.type !== 'flexWeekly' && !scheduleMatches(version.schedule, target);
}

export function occurrence(habit: Habit, date: ISODate, idx: DataIndex, today: ISODate): Occurrence {
  const version = versionOn(habit, date);
  const log = getLog(idx, habit.id, date);
  const base = { habit, date, version, log };

  if (!isHabitActiveOn(habit, date, idx)) {
    return { ...base, status: 'none', eligible: false, done: false, planned: false };
  }

  if (log?.status === 'rescheduled') {
    return { ...base, status: 'rescheduled', eligible: false, done: false, planned: false };
  }

  const rest = !!exceptionFor(habit, date, idx);
  const flexible = version.schedule.type === 'flexWeekly';
  const scheduled =
    !flexible &&
    (scheduleMatches(version.schedule, date) || !!idx.rescheduledInto.get(habit.id)?.has(date));

  if (flexible || !scheduled || rest) {
    // Extra / flexible / rest-day logs are shown but never count as daily opportunities.
    if (log) {
      const status = statusFromLog(habit, version, log);
      return {
        ...base,
        status,
        eligible: false,
        done: DONE_STATUSES.includes(status),
        planned: false,
      };
    }
    return { ...base, status: rest ? 'rest' : 'none', eligible: false, done: false, planned: false };
  }

  if (log) {
    const status = statusFromLog(habit, version, log);
    return { ...base, status, eligible: true, done: DONE_STATUSES.includes(status), planned: true };
  }

  if (date < today) {
    return {
      ...base,
      status: habit.kind === 'reduce' ? 'notLogged' : 'missed',
      eligible: true,
      done: false,
      planned: true,
    };
  }
  return { ...base, status: 'upcoming', eligible: false, done: false, planned: true };
}

/** Value used for time/quantity totals. */
export function logAmount(build: BuildConfig | null, log: ActivityLog): number {
  if (!build) return log.value ?? 0;
  if (log.value !== null && log.value !== undefined) return log.value;
  if (log.status === 'full') return build.target;
  if (log.status === 'minimum') return build.minimum ?? 0;
  return 0;
}

/** Choose a build-habit status from an entered value. */
export function statusForValue(build: BuildConfig, value: number): 'full' | 'minimum' | 'partial' {
  if (value >= build.target) return 'full';
  if (build.minimum !== null && value === build.minimum) return 'minimum';
  return 'partial';
}

export function isWithinLimit(reduce: ReduceConfig, value: number): boolean {
  return value <= reduce.limit;
}

export function isSensitiveBehavior(text: string): boolean {
  return /alcohol|\bdrink|beer|wine|liquor|vodka|whisk|smok|cigar|nicotine|\bvap(e|ing)|tobacco|\bdrugs?\b|cannabis|\bweed\b|\bpills?\b|medication|opioid|gambl|betting|casino|\beating\b|binge|purg|starv/i.test(
    text,
  );
}

export function isAlcohol(text: string): boolean {
  return /alcohol|drink|beer|wine|liquor|vodka|whisk/i.test(text);
}
