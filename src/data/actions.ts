import { addDays, todayISO } from '@/domain/dates';
import { newlyReachedMilestones } from '@/domain/analytics';
import { buildIndex, commitmentEndDate, currentVersion, isDraftsOwnHabit, versionOn } from '@/domain/schedule';
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

export function updateGoal(id: ID, patch: Partial<GoalInput & Pick<Goal, 'status' | 'achievedAt'>>) {
  mutate((d) => ({ goals: replace(d.goals, id, patch) }));
}

export function archiveGoal(id: ID) {
  updateGoal(id, { status: 'archived' });
}

/** Habits that only this goal relies on (no other active goal), not yet archived. */
export function habitsOnlyForGoal(d: Pick<UserData, 'habits' | 'goals'>, goalId: ID): Habit[] {
  const otherActive = new Set(d.goals.filter((g) => g.id !== goalId && g.status === 'active').map((g) => g.id));
  return d.habits.filter((h) => h.status !== 'archived' && h.goalIds.includes(goalId) && !h.goalIds.some((g) => otherActive.has(g)));
}

/**
 * "Let it go" (plan v1.4): the goal is set aside, its history kept (status 'archived').
 * Optionally archives the habits only this goal relies on; habits another active goal uses keep going.
 */
export function letGoGoal(id: ID, archiveItsHabits = false) {
  const day = todayISO();
  mutate((d) => {
    const drop = archiveItsHabits ? new Set(habitsOnlyForGoal(d, id).map((h) => h.id)) : new Set<ID>();
    return {
      goals: replace(d.goals, id, { status: 'archived' }),
      habits: d.habits.map((h) => (drop.has(h.id) ? { ...h, status: 'archived' as const, archivedAt: day, updatedAt: now() } : h)),
    };
  });
}

export function restoreGoal(id: ID) {
  updateGoal(id, { status: 'active', achievedAt: null });
}

/** A goal is a result: the user says when it's reached. Its habits are left as they are. */
export function markGoalAchieved(id: ID, achieved = true) {
  updateGoal(id, achieved ? { status: 'achieved', achievedAt: todayISO() } : { status: 'active', achievedAt: null });
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

/** A sign that a goal is achieved (plan v1.4): a goal milestone the user ticks themselves. */
export function addGoalSign(goalId: ID, title: string): ID {
  return addMilestone({ ownerType: 'goal', ownerId: goalId, title: title.trim() });
}

export function renameMilestone(id: ID, title: string) {
  mutate((d) => ({ milestones: replace(d.milestones, id, { title: title.trim() }) }));
}

export function deleteMilestone(id: ID) {
  mutate((d) => ({ milestones: d.milestones.filter((m) => m.id !== id) }));
}

// ---------------- Commitments ----------------

export type CommitmentInput = Pick<Commitment, 'goalId' | 'title' | 'startDate' | 'durationDays'> &
  Partial<Pick<Commitment, 'templateId' | 'renewedFromId' | 'habitIds'>>;

/** Creates a commitment in `draft` status. Habits are added, then `startCommitment` activates it. */
export function createCommitment(input: CommitmentInput): ID {
  const c = entity<Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>>({
    templateId: null,
    renewedFromId: null,
    habitIds: [],
    ...input,
    status: 'draft',
    pauses: [],
    endedAt: null,
  });
  mutate((d) => ({ commitments: [...d.commitments, c] }));
  return c.id;
}

/** Habits a draft set up for itself start with it. */
function shiftHabitStart(h: Habit, startDate: ISODate): Habit {
  return { ...h, startDate, versions: h.versions.map((v, i) => (i === 0 ? { ...v, effectiveFrom: startDate } : v)), updatedAt: now() };
}

export function updateCommitment(id: ID, patch: Partial<Pick<Commitment, 'title' | 'startDate' | 'durationDays' | 'goalId'>>) {
  mutate((d) => {
    const commitments = replace(d.commitments, id, patch);
    const c = commitments.find((x) => x.id === id);
    const habits =
      c && c.status === 'draft' && patch.startDate
        ? d.habits.map((h) => (isDraftsOwnHabit(c, h) ? shiftHabitStart(h, c.startDate) : h))
        : d.habits;
    return { commitments, habits };
  });
}

/** Add a habit to a commitment (it keeps its own schedule and history). */
export function addHabitToCommitment(commitmentId: ID, habitId: ID) {
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === commitmentId && !c.habitIds.includes(habitId) ? { ...c, habitIds: [...c.habitIds, habitId], updatedAt: now() } : c,
    ),
  }));
}

export function startCommitment(id: ID) {
  // A draft left for a few days starts today, so the days in between don't count as missed.
  const draft = data().commitments.find((c) => c.id === id);
  const today = todayISO();
  if (draft && draft.status === 'draft' && draft.startDate < today) updateCommitment(id, { startDate: today });
  mutate((d) => ({ commitments: replace(d.commitments, id, { status: 'active' }) }));
}

/** Discards a draft. Habits it created (never logged, in no other commitment) go with it. */
export function discardDraftCommitment(id: ID) {
  mutate((d) => {
    const draft = d.commitments.find((c) => c.id === id);
    const elsewhere = new Set(d.commitments.filter((c) => c.id !== id).flatMap((c) => c.habitIds));
    const logged = new Set(d.logs.map((l) => l.habitId));
    const drop = new Set(
      d.habits.filter((h) => draft && isDraftsOwnHabit(draft, h) && !elsewhere.has(h.id) && !logged.has(h.id)).map((h) => h.id),
    );
    return {
      commitments: d.commitments.filter((c) => c.id !== id),
      habits: d.habits.filter((h) => !drop.has(h.id)),
      milestones: d.milestones.filter((m) => !(m.ownerType === 'commitment' && m.ownerId === id)),
      exceptions: d.exceptions.filter((e) => e.commitmentId !== id && !(e.habitId && drop.has(e.habitId))),
    };
  });
}

/** Pausing a commitment pauses its habits too (they are what the commitment is about). */
export function pauseCommitment(id: ID, start: ISODate = todayISO(), end: ISODate | null = null) {
  mutate((d) => {
    const c = d.commitments.find((x) => x.id === id);
    const ids = new Set(c?.habitIds ?? []);
    return {
      commitments: d.commitments.map((x) =>
        x.id === id ? { ...x, status: 'paused', pauses: [...x.pauses, { start, end }], updatedAt: now() } : x,
      ),
      habits: d.habits.map((h) =>
        ids.has(h.id) && h.status === 'active'
          ? { ...h, status: end === null ? 'paused' : h.status, pauses: [...h.pauses, { start, end }], updatedAt: now() }
          : h,
      ),
    };
  });
}

/** Resuming: pauses that cover today end yesterday; pauses that start today or later are dropped. */
function endPausesBefore<P extends { start: ISODate; end: ISODate | null }>(pauses: P[], today: ISODate): P[] {
  const yesterday = addDays(today, -1);
  return pauses
    .map((p) => (p.end === null || p.end >= today ? { ...p, end: yesterday } : p))
    .filter((p) => p.end! >= p.start);
}

function resumed(h: Habit, today: ISODate): Habit {
  return { ...h, status: 'active', pauses: endPausesBefore(h.pauses, today), updatedAt: now() };
}

export function resumeCommitment(id: ID) {
  const today = todayISO();
  mutate((d) => {
    const c = d.commitments.find((x) => x.id === id);
    const ids = new Set(c?.habitIds ?? []);
    // Resume only habits paused together with the commitment, not ones paused on their own.
    const starts = new Set((c?.pauses ?? []).filter((p) => p.end === null).map((p) => p.start));
    const pausedWith = (h: Habit) => ids.has(h.id) && h.status === 'paused' && h.pauses.some((p) => p.end === null && starts.has(p.start));
    return {
      commitments: d.commitments.map((x) =>
        x.id === id ? { ...x, status: 'active', pauses: endPausesBefore(x.pauses, today), updatedAt: now() } : x,
      ),
      habits: d.habits.map((h) => (pausedWith(h) ? resumed(h, today) : h)),
    };
  });
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

/** Finish (status completed) or archive/end early. History is kept; the habits carry on. */
export function endCommitment(id: ID, status: 'completed' | 'archived' = 'completed') {
  const today = todayISO();
  mutate((d) => ({
    commitments: d.commitments.map((c) =>
      c.id === id ? { ...c, status, endedAt: c.endedAt ?? today, updatedAt: now() } : c,
    ),
  }));
}

/**
 * Habits that were paused only because their commitment ran out (data from before v1.4):
 * an open pause starting the day after the commitment's end. Resumed by renew / keep habits.
 */
function resumeStoppedByEnd(habits: Habit[], c: Commitment, today: ISODate): Habit[] {
  const end = commitmentEndDate(c);
  if (!end) return habits;
  const from = addDays(end, 1);
  return habits.map((h) =>
    c.habitIds.includes(h.id) && h.status === 'paused' && h.pauses.some((p) => p.end === null && p.start === from) ? resumed(h, today) : h,
  );
}

export function renewCommitment(id: ID, opts: { durationDays: number | null; targetScale?: number }): ID | null {
  const d = data();
  const old = d.commitments.find((c) => c.id === id);
  if (!old) return null;
  // If the old commitment still covers today, it keeps today (and today's logs); the new one starts tomorrow.
  const today = todayISO();
  const oldEnd = commitmentEndDate(old);
  const stillRunning = oldEnd === null || oldEnd >= today;
  const startDate = stillRunning ? addDays(today, 1) : today;
  const live = new Set(d.habits.filter((h) => h.status !== 'archived').map((h) => h.id));
  const c = entity<Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>>({
    goalId: old.goalId,
    habitIds: old.habitIds.filter((h) => live.has(h)),
    title: old.title,
    startDate,
    durationDays: opts.durationDays,
    status: 'active',
    templateId: old.templateId,
    renewedFromId: old.id,
    pauses: [],
    endedAt: null,
  });
  mutate((x) => ({
    commitments: [...x.commitments.map((k) => (k.id === id && k.status !== 'archived' ? { ...k, status: 'completed' as const, endedAt: k.endedAt ?? addDays(startDate, -1) } : k)), c],
    habits: resumeStoppedByEnd(x.habits, old, today),
  }));
  // A harder or easier challenge applies from the new start; the past keeps its targets.
  const scale = opts.targetScale ?? 1;
  if (scale !== 1) {
    for (const h of data().habits.filter((x) => c.habitIds.includes(x.id))) {
      const v = currentVersion(h);
      if (v.build) updateHabit(h.id, {}, { build: { ...v.build, target: Math.max(1, Math.round(v.build.target * scale)) } }, startDate);
    }
  }
  return c.id;
}

/** The commitment is over; its habits simply continue. */
export function keepHabitsOngoing(id: ID) {
  const old = data().commitments.find((c) => c.id === id);
  if (!old) return;
  mutate((x) => ({ habits: resumeStoppedByEnd(x.habits, old, todayISO()) }));
}

export function saveCommitmentReview(input: Omit<CommitmentReview, 'id' | 'createdAt' | 'updatedAt'>) {
  mutate((d) => {
    const existing = d.commitmentReviews.find((r) => r.commitmentId === input.commitmentId);
    if (existing) return { commitmentReviews: replace(d.commitmentReviews, existing.id, input) };
    return { commitmentReviews: [...d.commitmentReviews, entity(input)] };
  });
}

// ---------------- Habits ----------------

export type HabitInput = Pick<Habit, 'kind' | 'title' | 'icon' | 'goalIds' | 'startDate'> & {
  version: Omit<HabitVersion, 'effectiveFrom'>;
  safetyAcknowledged?: boolean;
  /** Also add the new habit to this commitment. */
  commitmentId?: ID | null;
};

export function createHabit(input: HabitInput): ID {
  const { version, commitmentId, ...rest } = input;
  const h = entity<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>({
    ...rest,
    status: 'active',
    archivedAt: null,
    pauses: [],
    versions: [{ ...version, effectiveFrom: input.startDate }],
    safetyAcknowledged: input.safetyAcknowledged ?? false,
  });
  mutate((d) => ({ habits: [...d.habits, h] }));
  if (commitmentId) addHabitToCommitment(commitmentId, h.id);
  return h.id;
}

/**
 * Edit a habit. Title/icon/links change in place; schedule/target changes become a
 * new version effective from `from` (default today) so past days keep their old rules.
 */
export function updateHabit(
  id: ID,
  patch: Partial<Pick<Habit, 'title' | 'icon' | 'goalIds' | 'safetyAcknowledged'>>,
  versionPatch?: Partial<Omit<HabitVersion, 'effectiveFrom'>>,
  from: ISODate = todayISO(),
) {
  mutate((d) => ({
    habits: d.habits.map((h) => {
      if (h.id !== id) return h;
      let versions = h.versions;
      if (versionPatch) {
        const effectiveFrom = from < h.startDate ? h.startDate : from;
        // Callers build the patch from the latest version, which may be a change scheduled
        // for later (e.g. an accepted suggestion from next Monday). Apply only the fields that
        // actually differ, on top of the version in effect on `effectiveFrom`, and carry them
        // into any later versions instead of dropping those.
        const latest = currentVersion(h);
        const diff = Object.fromEntries(
          Object.entries(versionPatch).filter(([k, val]) => JSON.stringify(val) !== JSON.stringify(latest[k as keyof HabitVersion])),
        ) as Partial<HabitVersion>;
        if (Object.keys(diff).length > 0) {
          const next: HabitVersion = { ...versionOn(h, effectiveFrom), ...diff, effectiveFrom };
          const later = h.versions.filter((v) => v.effectiveFrom > effectiveFrom).map((v) => ({ ...v, ...diff }));
          // Same-day (or not-yet-started) edits replace instead of stacking versions.
          versions = [...h.versions.filter((v) => v.effectiveFrom < effectiveFrom), next, ...later];
        }
      }
      return { ...h, ...patch, versions, updatedAt: now() };
    }),
  }));
}

/**
 * Open-ended pauses ("Pause habit") set the status to paused until resumed.
 * A bounded pause (e.g. an accepted "pause for a week" suggestion) only adds the range,
 * so the habit picks up again by itself when the range ends.
 */
export function pauseHabit(id: ID, start: ISODate = todayISO(), end: ISODate | null = null) {
  mutate((d) => ({
    habits: d.habits.map((h) =>
      h.id === id ? { ...h, status: end === null ? 'paused' : h.status, pauses: [...h.pauses, { start, end }], updatedAt: now() } : h,
    ),
  }));
}

export function resumeHabit(id: ID) {
  mutate((d) => ({
    habits: d.habits.map((h) =>
      h.id === id
        ? {
            ...h,
            status: 'active',
            pauses: endPausesBefore(h.pauses, todayISO()),
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
    commitments: d.commitments.map((c) => (c.habitIds.includes(id) ? { ...c, habitIds: c.habitIds.filter((x) => x !== id) } : c)),
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
  // Re-logging (e.g. changing the amount from Today) keeps urges and the note recorded earlier.
  const fields = {
    value: null,
    rescheduledTo: null,
    urges: existing?.urges ?? null,
    urgeIntensity: existing?.urgeIntensity ?? null,
    note: existing?.note ?? null,
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

// ---------------- Derived updates ----------------

/** Record session-based milestones that have been reached. Safe to call after any change. */
export function syncMilestones(today: ISODate = todayISO()) {
  const d = data();
  const reached = newlyReachedMilestones(d.milestones, d.commitments, d.habits, buildIndex(d), today);
  if (!reached.length) return;
  const dates = new Map(reached.map((r) => [r.id, r.date]));
  mutate((x) => ({
    milestones: x.milestones.map((m) => (dates.has(m.id) && !m.achievedAt ? { ...m, achievedAt: dates.get(m.id)!, updatedAt: now() } : m)),
  }));
}
