import { addDays, todayISO } from '@/domain/dates';

import { archiveHabit, createHabit, setLog, updateHabit } from './actions';
import { repository } from './repository';
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

const flush = () => new Promise((r) => setTimeout(r, 300));

const habitVersion = {
  schedule: { type: 'daily' as const },
  build: { trackingType: 'duration' as const, target: 10, unit: 'min', minimum: 2, minimumLabel: null },
  reduce: null,
  timeOfDay: 'morning' as const,
  reminderTime: null,
  anchor: null,
};

describe('accounts and persistence', () => {
  it('signs up, persists data, and isolates accounts', async () => {
    const s = useStore.getState();
    expect(await s.signUp({ name: 'Elena', email: 'elena@example.com', password: 'short' })).toMatch(/8 characters/);
    expect(await s.signUp({ name: 'Elena', email: 'Elena@Example.com', password: 'password123' })).toBeNull();
    expect(useStore.getState().status).toBe('ready');

    const id = createHabit({ kind: 'build', title: 'Speak', icon: 'record-voice-over', goalId: null, commitmentId: null, startDate: todayISO(), version: habitVersion });
    setLog(id, todayISO(), { status: 'full' });
    await flush();

    const userId = useStore.getState().user!.id;
    const saved = await repository.loadUserData(userId);
    expect(saved?.habits).toHaveLength(1);
    expect(saved?.logs).toHaveLength(1);

    await useStore.getState().signOut();
    expect(await useStore.getState().signUp({ name: 'Sam', email: 'elena@example.com', password: 'password123' })).toMatch(/already exists/);
    expect(await useStore.getState().signUp({ name: 'Sam', email: 'sam@example.com', password: 'password123' })).toBeNull();
    expect(useStore.getState().data.habits).toHaveLength(0);

    await useStore.getState().signOut();
    expect(await useStore.getState().signIn('elena@example.com', 'wrong-password')).toMatch(/incorrect/);
    expect(await useStore.getState().signIn('ELENA@example.com', 'password123')).toBeNull();
    expect(useStore.getState().data.habits).toHaveLength(1);
  });

  it('keeps history when a habit is edited, and deletes everything on account deletion', async () => {
    const id = useStore.getState().data.habits[0].id;
    // Pretend the habit started a week ago.
    useStore.getState().mutate((d) => ({
      habits: d.habits.map((h) => ({ ...h, startDate: addDays(todayISO(), -7), versions: [{ ...h.versions[0], effectiveFrom: addDays(todayISO(), -7) }] })),
    }));
    updateHabit(id, {}, { build: { ...habitVersion.build, target: 5 } });
    const h = useStore.getState().data.habits[0];
    expect(h.versions).toHaveLength(2);
    expect(h.versions[0].build?.target).toBe(10);
    expect(h.versions[1].effectiveFrom).toBe(todayISO());

    archiveHabit(id);
    expect(useStore.getState().data.habits[0].archivedAt).toBe(todayISO());

    const userId = useStore.getState().user!.id;
    await useStore.getState().deleteAccount();
    expect(await repository.loadUserData(userId)).toBeNull();
    expect((await repository.loadUsers()).some((u) => u.id === userId)).toBe(false);
    expect(useStore.getState().status).toBe('signedOut');
  });
});
