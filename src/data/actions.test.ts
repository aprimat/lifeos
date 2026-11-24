import { addDays, todayISO } from '@/domain/dates';
import { isHabitActiveOn, buildIndex, versionOn } from '@/domain/schedule';

import {
  applySuggestion,
  createCommitment,
  createHabit,
  pauseCommitment,
  pauseHabit,
  renewCommitment,
  resumeCommitment,
  resumeHabit,
  setLog,
  startCommitment,
  updateHabit,
} from './actions';
import { useStore } from './store';

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
  createHabit({ kind: 'build', title: 'Read', icon: 'book', goalId: null, commitmentId, startDate, version });

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
