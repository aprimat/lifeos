import { addDays, todayISO } from '@/domain/dates';
import { isHabitActiveOn, buildIndex, versionOn } from '@/domain/schedule';

import {
  addGoalSign,
  applySuggestion,
  createGoal,
  markGoalAchieved,
  renameMilestone,
  setMilestoneAchieved,
  createCommitment,
  createHabit,
  discardDraftCommitment,
  habitsOnlyForGoal,
  letGoGoal,
  endCommitment,
  pauseCommitment,
  pauseHabit,
  renewCommitment,
  resumeCommitment,
  restoreGoal,
  resumeHabit,
  setLog,
  startCommitment,
  updateHabit,
} from './actions';
import { useStore } from './store';
import { applyTemplate, getTemplate } from './templates';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => {
  const m = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => m.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void m.set(k, v),
    deleteItemAsync: async (k: string) => void m.delete(k),
  };
});
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_a: string, s: string) => nodeCrypto.createHash('sha256').update(s).digest('hex'),
  };
});

const today = todayISO();
const version = {
  schedule: { type: 'daily' as const },
  build: { trackingType: 'duration' as const, target: 20, unit: 'min', minimum: 5, minimumLabel: null },
  reduce: null,
  timeOfDay: 'morning' as const,
  reminderTime: null,
  anchor: null,
};
const state = () => useStore.getState().data;
const habit = (id: string) => state().habits.find((h) => h.id === id)!;
const idx = () => buildIndex(state());
const newHabit = (startDate = addDays(today, -14), commitmentId: string | null = null) =>
  createHabit({ kind: 'build', title: 'Read', icon: 'book', goalIds: [], commitmentId, startDate, version });

beforeAll(async () => {
  expect(await useStore.getState().signUp({ name: 'T', email: 'actions@example.com', password: 'password123' })).toBeNull();
});

describe('review fixes (actions)', () => {
  it('a suggested one-week pause ends by itself', () => {
    const id = newHabit();
    const from = addDays(today, -10);
    applySuggestion(id, { kind: 'pause', days: 7 }, from);
    expect(habit(id).status).toBe('active');
    expect(isHabitActiveOn(habit(id), addDays(from, 3), idx())).toBe(false);
    expect(isHabitActiveOn(habit(id), today, idx())).toBe(true);
  });

  it('resume ends a bounded pause that covers today', () => {
    const id = newHabit();
    pauseHabit(id, addDays(today, -2), addDays(today, 4));
    resumeHabit(id);
    expect(isHabitActiveOn(habit(id), today, idx())).toBe(true);
    expect(isHabitActiveOn(habit(id), addDays(today, -1), idx())).toBe(false);
  });

  it('resuming a commitment on the day it was paused un-pauses today', () => {
    const cid = createCommitment({ goalId: null, title: 'C', startDate: addDays(today, -5), durationDays: 30 });
    startCommitment(cid);
    pauseCommitment(cid);
    resumeCommitment(cid);
    const c = state().commitments.find((k) => k.id === cid)!;
    expect(c.pauses).toHaveLength(0);
  });

  it("an edit today keeps a change scheduled for later and doesn't pull it into today", () => {
    const id = newHabit();
    updateHabit(id, {}, { build: { ...version.build, target: 10 } }, addDays(today, 5));
    // The edit form sends the whole latest version with only the reminder changed.
    const latest = habit(id).versions[habit(id).versions.length - 1];
    const { effectiveFrom: _e, ...rest } = latest;
    updateHabit(id, {}, { ...rest, reminderTime: '08:00' });
    expect(versionOn(habit(id), today).build?.target).toBe(20);
    expect(versionOn(habit(id), today).reminderTime).toBe('08:00');
    expect(versionOn(habit(id), addDays(today, 5)).build?.target).toBe(10);
    expect(versionOn(habit(id), addDays(today, 5)).reminderTime).toBe('08:00');
  });

  it('re-logging keeps urges and the note', () => {
    const id = newHabit();
    setLog(id, today, { status: 'logged', value: 3, urges: 5, urgeIntensity: 4, note: 'busy day' });
    setLog(id, today, { status: 'logged', value: 2 });
    const log = state().logs.find((l) => l.habitId === id && l.date === today)!;
    expect(log).toMatchObject({ value: 2, urges: 5, urgeIntensity: 4, note: 'busy day' });
  });

  it('starting an old draft starts it today', () => {
    const cid = createCommitment({ goalId: null, title: 'Draft', startDate: addDays(today, -3), durationDays: 30 });
    const hid = newHabit(addDays(today, -3), cid);
    startCommitment(cid);
    expect(state().commitments.find((k) => k.id === cid)!.startDate).toBe(today);
    expect(habit(hid).startDate).toBe(today);
  });

  it('renewing a running commitment keeps today on the old one', () => {
    const cid = createCommitment({ goalId: null, title: 'Run', startDate: addDays(today, -9), durationDays: 30 });
    newHabit(addDays(today, -9), cid);
    startCommitment(cid);
    const nid = renewCommitment(cid, { durationDays: 30 })!;
    expect(state().commitments.find((k) => k.id === cid)!.endedAt).toBe(today);
    expect(state().commitments.find((k) => k.id === nid)!.startDate).toBe(addDays(today, 1));
  });
});

describe('v1.4: a commitment points at habits, it never owns them', () => {
  it('renewing keeps the same habits (no copies) and a harder target applies from the new start', () => {
    const cid = createCommitment({ goalId: null, title: 'Same', startDate: addDays(today, -9), durationDays: 30 });
    const hid = newHabit(addDays(today, -9), cid);
    startCommitment(cid);
    const before = state().habits.length;
    const nid = renewCommitment(cid, { durationDays: 30, targetScale: 1.5 })!;
    expect(state().habits.length).toBe(before);
    expect(state().commitments.find((k) => k.id === nid)!.habitIds).toEqual([hid]);
    expect(versionOn(habit(hid), today).build?.target).toBe(20);
    expect(versionOn(habit(hid), addDays(today, 1)).build?.target).toBe(30);
  });

  it('ending a commitment leaves its habits running', () => {
    const cid = createCommitment({ goalId: null, title: 'End', startDate: addDays(today, -5), durationDays: 30 });
    const hid = newHabit(addDays(today, -5), cid);
    startCommitment(cid);
    endCommitment(cid);
    expect(isHabitActiveOn(habit(hid), addDays(today, 3), idx())).toBe(true);
  });

  it('pausing a commitment pauses its habits; resuming brings back only those', () => {
    const cid = createCommitment({ goalId: null, title: 'Pause', startDate: addDays(today, -5), durationDays: 30 });
    const a = newHabit(addDays(today, -5), cid);
    const b = newHabit(addDays(today, -5), cid);
    startCommitment(cid);
    pauseHabit(b, addDays(today, -3)); // paused on its own before
    pauseCommitment(cid);
    expect(habit(a).status).toBe('paused');
    resumeCommitment(cid);
    expect(habit(a).status).toBe('active');
    expect(habit(b).status).toBe('paused');
  });

  it('discarding a draft removes only the habits it created', async () => {
    const keep = newHabit();
    await new Promise((r) => setTimeout(r, 5));
    const cid = createCommitment({ goalId: null, title: 'Draft', startDate: today, durationDays: 7, habitIds: [keep] });
    const made = newHabit(today, cid);
    discardDraftCommitment(cid);
    expect(state().habits.some((h) => h.id === made)).toBe(false);
    expect(state().habits.some((h) => h.id === keep)).toBe(true);
  });
});

describe('v1.4: starting an old draft', () => {
  it("moves only the draft's own habits to today, not existing ones it points at", async () => {
    const existing = newHabit(addDays(today, -20));
    await new Promise((r) => setTimeout(r, 5));
    const cid = createCommitment({ goalId: null, title: 'Old draft', startDate: addDays(today, -3), durationDays: 30, habitIds: [existing] });
    const own = newHabit(addDays(today, -3), cid);
    startCommitment(cid);
    expect(habit(existing).startDate).toBe(addDays(today, -20));
    expect(habit(own).startDate).toBe(today);
  });
});

describe('v1.4: a goal and the signs that it is achieved', () => {
  test('a template creates its goal with suggested signs; no goal means no signs', () => {
    const before = state().milestones.length;
    const ids = applyTemplate('movement', { answers: {}, startDate: today });
    const goalId = habit(ids[0]).goalIds[0];
    const signs = state().milestones.filter((m) => m.ownerType === 'goal' && m.ownerId === goalId);
    expect(signs.map((m) => m.title)).toEqual(getTemplate('movement')!.goalSigns);
    expect(signs.every((m) => m.achievedAt === null)).toBe(true);

    applyTemplate('movement', { answers: {}, startDate: today, goalId: null });
    expect(state().milestones.length).toBe(before + signs.length);
  });

  test('ticking every sign leaves the goal for the user to mark achieved', () => {
    const g = createGoal({ title: 'Be healthy', focusArea: 'health', myWhy: null, desiredOutcome: null });
    const a = addGoalSign(g, '  Lost 9 kg ');
    const b = addGoalSign(g, 'Eat healthy');
    setMilestoneAchieved(a, true);
    setMilestoneAchieved(b, true);
    expect(state().goals.find((x) => x.id === g)!.status).toBe('active');
    expect(state().milestones.find((m) => m.id === a)!.title).toBe('Lost 9 kg');
    renameMilestone(b, 'Eat healthy most days');
    setMilestoneAchieved(b, false);
    expect(state().milestones.find((m) => m.id === b)).toMatchObject({ title: 'Eat healthy most days', achievedAt: null });
    markGoalAchieved(g);
    expect(state().goals.find((x) => x.id === g)!.status).toBe('achieved');
  });
});

describe('v1.4: letting a goal go', () => {
  const goal = (title: string) => createGoal({ title, focusArea: null, myWhy: null, desiredOutcome: null });
  const linked = (goalIds: string[]) =>
    createHabit({ kind: 'build', title: 'Walk', icon: 'directions-walk', goalIds, startDate: addDays(today, -7), version });

  test('keeps habits by default', () => {
    const g = goal('Run a marathon');
    const h = linked([g]);
    letGoGoal(g);
    expect(state().goals.find((x) => x.id === g)!.status).toBe('archived');
    expect(habit(h).status).toBe('active');
  });

  test('can archive the habits only this goal relies on; shared ones keep going', () => {
    const g = goal('Find a better job');
    const other = goal('Be healthy');
    const own = linked([g]);
    const shared = linked([g, other]);
    expect(habitsOnlyForGoal(state(), g).map((h) => h.id)).toEqual([own]);
    letGoGoal(g, true);
    expect(habit(own)).toMatchObject({ status: 'archived', archivedAt: today });
    expect(habit(shared).status).toBe('active');
    restoreGoal(g);
    expect(state().goals.find((x) => x.id === g)!.status).toBe('active');
  });
});
