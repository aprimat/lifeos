import { addDays, maxDate } from './dates';
import { commitmentEndDate } from './schedule';
import { emptyUserData, SCHEMA_VERSION, type Commitment, type DateRange, type Habit, type ID, type ISODate, type UserData } from './types';

/**
 * Brings saved data up to the current schema. Pure: `today` is passed in.
 *
 * v1 → v2 (plan v1.4): a habit no longer belongs to a commitment, and it can support several goals.
 * - `habit.goalId` becomes `habit.goalIds`.
 * - `habit.commitmentId` becomes `commitment.habitIds`.
 * - What the commitment used to do to its habits is written onto the habit, so the past reads the same:
 *   the habit starts no earlier than the commitment, carries its pauses, and
 *   - if the commitment was finished: the habit is archived on the commitment's last day
 *     (finishing used to stop it; "keep habits" and "renew" had already made copies);
 *   - if the commitment ran past its end without being finished: the habit is paused from the day after,
 *     so nothing counts as missed and "keep habits" / "renew" can simply resume it.
 * - Only one commitment may run: the most recent running one stays, older ones are marked finished today
 *   (their habits keep going).
 */

type V1Habit = Omit<Habit, 'goalIds'> & { goalId?: ID | null; commitmentId?: ID | null; goalIds?: ID[] };
type V1Commitment = Omit<Commitment, 'habitIds'> & { habitIds?: ID[] };

export function migrateData(raw: unknown, today: ISODate): UserData {
  const base = emptyUserData();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<UserData> & { schemaVersion?: number };
  const merged = { ...base, ...data, settings: { ...base.settings, ...data.settings } } as UserData;
  if ((data.schemaVersion ?? 1) >= SCHEMA_VERSION) return merged;
  return v1ToV2(merged, today);
}

const RUNNING = new Set(['active', 'paused']);
const isOpen = (p: DateRange) => p.end === null;

function v1ToV2(data: UserData, today: ISODate): UserData {
  const oldHabits = data.habits as unknown as V1Habit[];
  const oldCommitments = data.commitments as unknown as V1Commitment[];
  const byId = new Map(oldCommitments.map((c) => [c.id, { ...c, habitIds: c.habitIds ?? [] } as Commitment]));

  const habits: Habit[] = oldHabits.map((h) => {
    const { goalId, commitmentId, ...rest } = h;
    let habit: Habit = { ...rest, goalIds: h.goalIds ?? (goalId ? [goalId] : []) };
    const c = commitmentId ? byId.get(commitmentId) : undefined;
    if (!c) return habit;
    c.habitIds.push(habit.id);
    if (c.status === 'draft') return habit; // still hidden until the draft starts

    const startDate = maxDate(habit.startDate, c.startDate);
    habit = {
      ...habit,
      startDate,
      versions: habit.versions.map((v, i) => (i === 0 && v.effectiveFrom < startDate ? { ...v, effectiveFrom: startDate } : v)),
      pauses: [...habit.pauses, ...c.pauses.map((p) => ({ ...p }))],
    };
    if (c.status === 'paused' && c.pauses.some(isOpen) && habit.status === 'active') habit.status = 'paused';

    const end = commitmentEndDate(c);
    if (end === null || habit.status === 'archived') return habit;
    const finished = c.status === 'completed' || c.status === 'archived';
    if (finished) {
      return { ...habit, status: 'archived', archivedAt: maxDate(end, startDate) };
    }
    if (end < today) {
      return { ...habit, status: 'paused', pauses: [...habit.pauses, { start: addDays(end, 1), end: null }] };
    }
    return habit;
  });

  // One running commitment at a time: keep the latest start; finish the others today.
  const running = [...byId.values()]
    .filter((c) => RUNNING.has(c.status) && (commitmentEndDate(c) ?? today) >= today)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : a.createdAt < b.createdAt ? 1 : -1));
  for (const c of running.slice(1)) {
    c.status = 'completed';
    c.endedAt = maxDate(today, c.startDate);
  }

  return { ...data, schemaVersion: SCHEMA_VERSION, habits, commitments: [...byId.values()] };
}
