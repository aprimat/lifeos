import { create } from 'zustand';

import { todayISO } from '@/domain/dates';
import { migrateData } from '@/domain/migrate';
import { emptyUserData, SCHEMA_VERSION, type FocusArea, type User, type UserData } from '@/domain/types';
import {
  hashPassword,
  newId,
  newSalt,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from '@/services/auth';
import { getSessionUserId, setSessionUserId } from '@/services/session';

import { repository } from './repository';

/**
 * App state: the signed-in user and all of their data, loaded in memory and
 * persisted through `repository` after every change (debounced).
 *
 * Screens read with `useStore(s => …)` / the hooks in `src/hooks/`, and write
 * only through the functions in `src/data/actions.ts`.
 */

export type AuthStatus = 'loading' | 'signedOut' | 'ready';

interface AppState {
  status: AuthStatus;
  user: User | null;
  data: UserData;
  init(): Promise<void>;
  signUp(input: { name: string; email: string; password: string }): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Returns an error message, or null on success. */
  updateUser(patch: Partial<Pick<User, 'name' | 'email' | 'focusAreas' | 'onboardingCompletedAt'>>): Promise<string | null>;
  /** Apply an immutable change: return only the collections that changed. */
  mutate(recipe: (d: UserData) => Partial<UserData>): void;
  /** Replace all data (seed / import). */
  replaceData(data: UserData): void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(userId: string, data: UserData) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    repository.saveUserData(userId, data).catch((e) => console.warn('LifeOS: save failed', e));
  }, 250);
}

/** Flush pending writes immediately (e.g. when the app goes to background). */
export async function flushSave(): Promise<void> {
  const { user, data } = useStore.getState();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (user) await repository.saveUserData(user.id, data);
  }
}

/** Load a user's data, bringing it up to the current schema (and saving that once). */
async function loadData(userId: string): Promise<UserData> {
  const raw = await repository.loadUserData(userId);
  const data = migrateData(raw, todayISO());
  const from = raw ? ((raw as { schemaVersion?: number }).schemaVersion ?? 1) : SCHEMA_VERSION;
  if (from < SCHEMA_VERSION) {
    try {
      await repository.backupUserData(userId, from, raw);
      await repository.saveUserData(userId, data);
    } catch (e) {
      console.warn('LifeOS: could not save migrated data', e);
    }
  }
  return data;
}

export const useStore = create<AppState>((set, get) => ({
  status: 'loading',
  user: null,
  data: emptyUserData(),

  async init() {
    try {
      const userId = await getSessionUserId();
      if (!userId) return set({ status: 'signedOut' });
      const users = await repository.loadUsers();
      const user = users.find((u) => u.id === userId);
      if (!user) {
        await setSessionUserId(null);
        return set({ status: 'signedOut' });
      }
      const data = await loadData(user.id);
      set({ status: 'ready', user, data });
    } catch (e) {
      console.warn('LifeOS: init failed', e);
      set({ status: 'signedOut' });
    }
  },

  async signUp({ name, email, password }) {
    const emailError = validateEmail(email);
    if (emailError) return emailError;
    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;
    if (!name.trim()) return 'Enter your name.';
    const users = await repository.loadUsers();
    const normalized = normalizeEmail(email);
    if (users.some((u) => u.email === normalized)) return 'An account with this email already exists on this device.';
    const salt = newSalt();
    const now = new Date().toISOString();
    const user: User = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      email: normalized,
      name: name.trim(),
      salt,
      passwordHash: await hashPassword(password, salt),
      focusAreas: [] as FocusArea[],
      onboardingCompletedAt: null,
    };
    await repository.saveUsers([...users, user]);
    const data = emptyUserData();
    await repository.saveUserData(user.id, data);
    await setSessionUserId(user.id);
    set({ status: 'ready', user, data });
    return null;
  },

  async signIn(email, password) {
    const users = await repository.loadUsers();
    const user = users.find((u) => u.email === normalizeEmail(email));
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      return 'Email or password is incorrect.';
    }
    const data = await loadData(user.id);
    await setSessionUserId(user.id);
    set({ status: 'ready', user, data });
    return null;
  },

  async signOut() {
    await flushSave();
    await setSessionUserId(null);
    set({ status: 'signedOut', user: null, data: emptyUserData() });
  },

  async deleteAccount() {
    const { user } = get();
    if (!user) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    const users = await repository.loadUsers();
    await repository.saveUsers(users.filter((u) => u.id !== user.id));
    await repository.deleteUserData(user.id);
    await setSessionUserId(null);
    set({ status: 'signedOut', user: null, data: emptyUserData() });
  },

  async updateUser(patch) {
    const { user } = get();
    if (!user) return null;
    const users = await repository.loadUsers();
    if (patch.name !== undefined && !patch.name.trim()) return 'Enter your name.';
    if (patch.email !== undefined) {
      const emailError = validateEmail(patch.email);
      if (emailError) return emailError;
      patch = { ...patch, email: normalizeEmail(patch.email) };
      if (users.some((u) => u.id !== user.id && u.email === patch.email)) return 'Another account on this device already uses this email.';
    }
    const next: User = { ...user, ...patch, updatedAt: new Date().toISOString() };
    await repository.saveUsers(users.map((u) => (u.id === user.id ? next : u)));
    set({ user: next });
    return null;
  },

  mutate(recipe) {
    const { user, data } = get();
    const patch = recipe(data);
    const next = { ...data, ...patch };
    set({ data: next });
    if (user) scheduleSave(user.id, next);
  },

  replaceData(data) {
    const { user } = get();
    set({ data });
    if (user) scheduleSave(user.id, data);
  },
}));
