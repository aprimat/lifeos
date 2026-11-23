import { addDays, todayISO } from '@/domain/dates';
import { currentVersion } from '@/domain/schedule';
import type { SuggestedChange } from '@/domain/suggestions';
import type {
  ActivityLog,
  AutomaticityRating,
  CheckIn,
  Commitment,
  CommitmentReview,
  Goal,
  Habit,
  HabitVersion,
  ID,
  ISODate,
  Milestone,
  Reflection,
  ScheduleException,
  Settings,
  UserData,
  WeeklyReview,
} from '@/domain/types';
import { newId } from '@/services/auth';

import { useStore } from './store';

/**
 * All writes go through these functions. They never rewrite history:
 * habit edits append a new HabitVersion effective from today.
 */

const now = () => new Date().toISOString();
const mutate = (recipe: (d: UserData) => Partial<UserData>) => useStore.getState().mutate(recipe);
const data = () => useStore.getState().data;

function entity<T>(fields: T): T & { id: ID; createdAt: string; updatedAt: string } {
  const t = now();
  return { id: newId(), createdAt: t, updatedAt: t, ...fields };
}

function replace<T extends { id: ID }>(list: T[], id: ID, patch: Partial<NoInfer<T>>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x));
}

// ---------------- Settings ----------------

export function updateSettings(patch: Partial<Settings>) {
  mutate((d) => ({ settings: { ...d.settings, ...patch } }));
}

export function dismissPrompt(key: string) {
  mutate((d) => ({ dismissedPrompts: d.dismissedPrompts.includes(key) ? d.dismissedPrompts : [...d.dismissedPrompts, key] }));
}

// ---------------- Goals ----------------

export type GoalInput = Pick<Goal, 'title' | 'focusArea' | 'myWhy' | 'desiredOutcome'>;

export function createGoal(input: GoalInput): ID {
  const goal = entity<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>({ ...input, status: 'active' });
  mutate((d) => ({ goals: [...d.goals, goal] }));
  return goal.id;
}

export function updateGoal(id: ID, patch: Partial<GoalInput & Pick<Goal, 'status'>>) {
  mutate((d) => ({ goals: replace(d.goals, id, patch) }));
}

export function archiveGoal(id: ID) {
  updateGoal(id, { status: 'archived' });
}

export function restoreGoal(id: ID) {
  updateGoal(id, { status: 'active' });
}

// ---------------- Milestones ----------------

export function addMilestone(input: Pick<Milestone, 'ownerType' | 'ownerId' | 'title'> & Partial<Pick<Milestone, 'targetSessions' | 'targetDate'>>): ID {
  const m = entity<Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>>({
    targetSessions: null,
    targetDate: null,
    achievedAt: null,
    ...input,
  });
  mutate((d) => ({ milestones: [...d.milestones, m] }));
  return m.id;
}

export function setMilestoneAchieved(id: ID, achieved: boolean) {
  mutate((d) => ({ milestones: replace(d.milestones, id, { achievedAt: achieved ? todayISO() : null }) }));
}

export function deleteMilestone(id: ID) {
  mutate((d) => ({ milestones: d.milestones.filter((m) => m.id !== id) }));
}

// ---------------- Commitments ----------------

export type CommitmentInput = Pick<Commitment, 'goalId' | 'title' | 'startDate' | 'durationDays'> &
  Partial<Pick<Commitment, 'templateId' | 'renewedFromId'>>;

/** Creates a commitment in `draft` status. Habits are added, then `startCommitment` activates it. */
export function createCommitment(input: CommitmentInput): ID {
  const c = entity<Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>>({
    templateId: null,
    renewedFromId: null,
    ...input,
    status: 'draft',
    pauses: [],
    endedAt: null,
  });
  mutate((d) => ({ commitments: [...d.commitments, c] }));
  return c.id;
}

export function updateCommitment(id: ID, patch: Partial<Pick<Commitment, 'title' | 'startDate' | 'durationDays' | 'goalId'>>) {
  mutate((d) => {
    const commitments = replace(d.commitments, id, patch);
    // Keep habits of a draft commitment starting with it.
    const c = commitments.find((x) => x.id === id);
    const habits =
      c && c.status === 'draft' && patch.startDate
        ? d.habits.map((h) =>
            h.commitmentId === id
              ? { ...h, startDate: c.startDate, versions: h.versions.map((v, i) => (i === 0 ? { ...v, effectiveFrom: c.startDate } : v)) }
              : h,
          )
        : d.habits;
    return { commitments, habits };
  });
}

export function startCommitment(id: ID) {
  mutate((d) => ({ commitments: replace(d.commitments, id, { status: 'active' }) }));
}

/** Discards a draft and its habits (nothing has been logged yet). */
export function discardDraftCommitment(id: ID) {
  mutate((d) => ({
    commitments: d.commitments.filter((c) => c.id !== id),
    habits: d.habits.filter((h) => h.commitmentId !== id),
    milestones: d.milestones.filter((m) => !(m.ownerType === 'commitment' && m.ownerId === id)),
    exceptions: d.exceptions.filter((e) => e.commitmentId !== id),
  }));
}

export function pauseCommitment(id: ID, start: ISODate = todayISO(), end: ISODate | null = null) {
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === id ? { ...c, status: 'paused', pauses: [...c.pauses, { start, end }], updatedAt: now() } : c,
    ),
  }));
}

export function resumeCommitment(id: ID) {
  const yesterday = addDays(todayISO(), -1);
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'active',
            pauses: c.pauses.map((p) => (p.end === null ? { ...p, end: p.start > yesterday ? p.start : yesterday } : p)).filter((p) => p.end! >= p.start),
            updatedAt: now(),
          }
        : c,
    ),
  }));
}

export function extendCommitment(id: ID, extraDays: number) {
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === id
        ? { ...c, durationDays: (c.durationDays ?? 0) + extraDays, status: c.status === 'completed' ? 'active' : c.status, endedAt: null, updatedAt: now() }
        : c,
    ),
  }));
}

/** Finish (status completed) or archive/end early. History is kept. */
export function endCommitment(id: ID, status: 'completed' | 'archived' = 'completed') {
  const today = todayISO();
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === id ? { ...c, status, endedAt: c.endedAt ?? today, updatedAt: now() } : c,
    ),
  }));
}

/**
 * Copies habits (current version) into a new owner, starting on `startDate`.
 * Used by renew / keep-habits so the original commitment's history stays intact.
 */
function cloneHabits(habits: Habit[], startDate: ISODate, owner: { commitmentId: ID | null; goalId: ID | null }, targetScale = 1): Habit[] {
  return habits.map((h) => {
    const v = currentVersion(h);
    const build = v.build && targetScale !== 1 ? { ...v.build, target: Math.max(1, Math.round(v.build.target * targetScale)) } : v.build;
    return entity<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>({
      kind: h.kind,
      title: h.title,
      icon: h.icon,
      goalId: owner.goalId ?? h.goalId,
      commitmentId: owner.commitmentId,
      status: 'active',
      startDate,
      archivedAt: null,
      pauses: [],
      versions: [{ ...v, build, effectiveFrom: startDate }],
      safetyAcknowledged: h.safetyAcknowledged,
    });
  });
}

export function renewCommitment(id: ID, opts: { durationDays: number | null; targetScale?: number }): ID | null {
  const d = data();
  const old = d.commitments.find((c) => c.id === id);
  if (!old) return null;
  const startDate = todayISO();
  const c = entity<Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>>({
    goalId: old.goalId,
    title: old.title,
    startDate,
    durationDays: opts.durationDays,
    status: 'active',
    templateId: old.templateId,
    renewedFromId: old.id,
    pauses: [],
    endedAt: null,
  });
  const oldHabits = d.habits.filter((h) => h.commitmentId === id && h.status !== 'archived');
  const habits = cloneHabits(oldHabits, startDate, { commitmentId: c.id, goalId: old.goalId }, opts.targetScale ?? 1);
  mutate((x) => ({
    commitments: [...x.commitments.map((k) => (k.id === id && k.status !== 'archived' ? { ...k, status: 'completed' as const, endedAt: k.endedAt ?? addDays(startDate, -1) } : k)), c],
    habits: [...x.habits, ...habits],
  }));
  return c.id;
}

/** Continue the commitment's habits as standalone habits from today. */
export function keepHabitsOngoing(id: ID) {
  const d = data();
  const old = d.commitments.find((c) => c.id === id);
  if (!old) return;
  const oldHabits = d.habits.filter((h) => h.commitmentId === id && h.status !== 'archived');
  const habits = cloneHabits(oldHabits, todayISO(), { commitmentId: null, goalId: old.goalId });
  mutate((x) => ({ habits: [...x.habits, ...habits] }));
}

export function saveCommitmentReview(input: Omit<CommitmentReview, 'id' | 'createdAt' | 'updatedAt'>) {
  mutate((d) => {
    const existing = d.commitmentReviews.find((r) => r.commitmentId === input.commitmentId);
    if (existing) return { commitmentReviews: replace(d.commitmentReviews, existing.id, input) };
    return { commitmentReviews: [...d.commitmentReviews, entity(input)] };
  });
}

// ---------------- Habits ----------------

export type HabitInput = Pick<Habit, 'kind' | 'title' | 'icon' | 'goalId' | 'commitmentId' | 'startDate'> & {
  version: Omit<HabitVersion, 'effectiveFrom'>;
  safetyAcknowledged?: boolean;
};

export function createHabit(input: HabitInput): ID {
  const { version, ...rest } = input;
  const h = entity<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>({
    ...rest,
    status: 'active',
    archivedAt: null,
    pauses: [],
    versions: [{ ...version, effectiveFrom: input.startDate }],
    safetyAcknowledged: input.safetyAcknowledged ?? false,
  });
  mutate((d) => ({ habits: [...d.habits, h] }));
  return h.id;
}

/**
 * Edit a habit. Title/icon/links change in place; schedule/target changes become a
 * new version effective from `from` (default today) so past days keep their old rules.
 */
export function updateHabit(
  id: ID,
  patch: Partial<Pick<Habit, 'title' | 'icon' | 'goalId' | 'commitmentId' | 'safetyAcknowledged'>>,
  versionPatch?: Partial<Omit<HabitVersion, 'effectiveFrom'>>,
  from: ISODate = todayISO(),
) {
  mutate((d) => ({
    habits: d.habits.map((h) => {
      if (h.id !== id) return h;
      let versions = h.versions;
      if (versionPatch) {
        const effectiveFrom = from < h.startDate ? h.startDate : from;
        const base = currentVersion(h);
        const next: HabitVersion = { ...base, ...versionPatch, effectiveFrom };
        // Same-day (or not-yet-started) edits replace instead of stacking versions.
        versions = [...h.versions.filter((v) => v.effectiveFrom < effectiveFrom), next];
      }
      return { ...h, ...patch, versions, updatedAt: now() };
    }),
  }));
}

export function pauseHabit(id: ID, start: ISODate = todayISO(), end: ISODate | null = null) {
  mutate((d) => ({
    habits: d.habits.map((h) => (h.id === id ? { ...h, status: 'paused', pauses: [...h.pauses, { start, end }], updatedAt: now() } : h)),
  }));
}

export function resumeHabit(id: ID) {
  const yesterday = addDays(todayISO(), -1);
  mutate((d) => ({
    habits: d.habits.map((h) =>
      h.id === id
        ? {
            ...h,
            status: 'active',
            pauses: h.pauses.map((p) => (p.end === null ? { ...p, end: yesterday } : p)).filter((p) => p.end! >= p.start),
            updatedAt: now(),
          }
        : h,
    ),
  }));
}

export function archiveHabit(id: ID) {
  mutate((d) => ({ habits: replace(d.habits, id, { status: 'archived', archivedAt: todayISO() }) }));
}

/** Only for habits with no logs (e.g. removing one from a draft commitment). */
export function deleteHabit(id: ID) {
  mutate((d) => ({
    habits: d.habits.filter((h) => h.id !== id),
    logs: d.logs.filter((l) => l.habitId !== id),
    exceptions: d.exceptions.filter((e) => e.habitId !== id),
  }));
}

// ---------------- Exceptions ----------------

export function addException(input: Pick<ScheduleException, 'habitId' | 'commitmentId' | 'start' | 'end' | 'kind'> & { note?: string | null }): ID {
  const e = entity<Omit<ScheduleException, 'id' | 'createdAt' | 'updatedAt'>>({ note: null, ...input });
  mutate((d) => ({ exceptions: [...d.exceptions, e] }));
  return e.id;
}

export function removeException(id: ID) {
  mutate((d) => ({ exceptions: d.exceptions.filter((e) => e.id !== id) }));
}

// ---------------- Logs ----------------

export type LogInput = Pick<ActivityLog, 'status'> &
  Partial<Pick<ActivityLog, 'value' | 'rescheduledTo' | 'urges' | 'urgeIntensity' | 'note'>>;

/** Create or replace the log for (habit, date). */
export function setLog(habitId: ID, date: ISODate, input: LogInput): ID {
  const existing = data().logs.find((l) => l.habitId === habitId && l.date === date);
  const fields = {
    value: null,
    rescheduledTo: null,
    urges: null,
    urgeIntensity: null,
    note: null,
    ...input,
  };
  if (existing) {
    mutate((d) => ({ logs: replace(d.logs, existing.id, fields) }));
    return existing.id;
  }
  const log = entity<Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'>>({ habitId, date, ...fields });
  mutate((d) => ({ logs: [...d.logs, log] }));
  return log.id;
}

export function clearLog(habitId: ID, date: ISODate) {
  mutate((d) => ({ logs: d.logs.filter((l) => !(l.habitId === habitId && l.date === date)) }));
}

/** Mark one day as planned rest for a single habit. */
export function markRestDay(habitId: ID, date: ISODate) {
  clearLog(habitId, date);
  addException({ habitId, commitmentId: null, start: date, end: date, kind: 'rest' });
}

// ---------------- Reflections / check-ins / ratings ----------------

export function saveReflection(input: Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>): ID {
  const existing = data().reflections.find((r) => r.habitId === input.habitId && r.date === input.date);
  if (existing) {
    mutate((d) => ({ reflections: replace(d.reflections, existing.id, input) }));
    return existing.id;
  }
  const r = entity(input);
  mutate((d) => ({ reflections: [...d.reflections, r] }));
  return r.id;
}

export function saveCheckIn(input: Omit<CheckIn, 'id' | 'createdAt' | 'updatedAt'>): ID {
  const existing = data().checkIns.find((c) => c.date === input.date);
  if (existing) {
    mutate((d) => ({ checkIns: replace(d.checkIns, existing.id, input) }));
    return existing.id;
  }
  const c = entity(input);
  mutate((d) => ({ checkIns: [...d.checkIns, c] }));
  return c.id;
}

export function rateAutomaticity(habitId: ID, score: number, date: ISODate = todayISO()) {
  const existing = data().automaticity.find((a) => a.habitId === habitId && a.date === date);
  if (existing) {
    mutate((d) => ({ automaticity: replace(d.automaticity, existing.id, { score }) }));
    return;
  }
  const a = entity<Omit<AutomaticityRating, 'id' | 'createdAt' | 'updatedAt'>>({ habitId, date, score });
  mutate((d) => ({ automaticity: [...d.automaticity, a] }));
}

// ---------------- Weekly review & suggestions ----------------

export function saveWeeklyReview(input: Omit<WeeklyReview, 'id' | 'createdAt' | 'updatedAt'>): ID {
  const existing = data().weeklyReviews.find((r) => r.weekStart === input.weekStart);
  if (existing) {
    mutate((d) => ({ weeklyReviews: replace(d.weeklyReviews, existing.id, input) }));
    return existing.id;
  }
  const r = entity(input);
  mutate((d) => ({ weeklyReviews: [...d.weeklyReviews, r] }));
  return r.id;
}

/**
 * Apply an accepted (or edited) suggestion. Changes take effect from `from`
 * (next Monday for weekly reviews), never retroactively.
 */
export function applySuggestion(habitId: ID, change: SuggestedChange, from: ISODate) {
  const habit = data().habits.find((h) => h.id === habitId);
  if (!habit) return;
  const v = currentVersion(habit);
  switch (change.kind) {
    case 'target':
      if (v.build) updateHabit(habitId, {}, { build: { ...v.build, target: change.to, minimum: v.build.minimum !== null ? Math.min(v.build.minimum, change.to) : null } }, from);
      break;
    case 'limit':
      if (v.reduce) updateHabit(habitId, {}, { reduce: { ...v.reduce, limit: change.to } }, from);
      break;
    case 'reminder':
      updateHabit(habitId, {}, { reminderTime: change.time }, from);
      break;
    case 'timeOfDay':
      updateHabit(habitId, {}, { timeOfDay: change.to }, from);
      break;
    case 'pause':
      pauseHabit(habitId, from, addDays(from, change.days - 1));
      break;
    case 'plan':
      saveReflection({
        habitId,
        date: todayISO(),
        obstacles: [],
        triggers: [change.trigger],
        helpNextTime: `If ${change.trigger.toLowerCase()}, then I will…`,
        note: null,
      });
      break;
  }
}

// ---------------- Bulk ----------------

export function exportData(): UserData {
  return data();
}

// ---------------- Onboarding ----------------

/** Mark onboarding finished (first item created, or the user chose "decide later"). */
export async function completeOnboarding() {
  const { user, updateUser } = useStore.getState();
  if (user && !user.onboardingCompletedAt) await updateUser({ onboardingCompletedAt: new Date().toISOString() });
}
