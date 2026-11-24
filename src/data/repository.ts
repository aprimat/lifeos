import AsyncStorage from '@react-native-async-storage/async-storage';

import type { User, UserData } from '@/domain/types';

/**
 * The only module that knows how data is persisted.
 *
 * MVP: on-device storage (AsyncStorage — SQLite-backed on Android, file-backed on iOS,
 * localStorage on web). A future backend implements the same interface
 * (e.g. `ApiRepository`) and is swapped in via `repository` below.
 */
export interface Repository {
  loadUsers(): Promise<User[]>;
  saveUsers(users: User[]): Promise<void>;
  loadUserData(userId: string): Promise<UserData | null>;
  saveUserData(userId: string, data: UserData): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
}

const USERS_KEY = 'lifeos:v1:users';
const dataKey = (userId: string) => `lifeos:v1:data:${userId}`;

export class LocalRepository implements Repository {
  async loadUsers(): Promise<User[]> {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  }

  async saveUsers(users: User[]): Promise<void> {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async loadUserData(userId: string): Promise<UserData | null> {
    const raw = await AsyncStorage.getItem(dataKey(userId));
    return raw ? (JSON.parse(raw) as UserData) : null;
  }

  async saveUserData(userId: string, data: UserData): Promise<void> {
    await AsyncStorage.setItem(dataKey(userId), JSON.stringify(data));
  }

  async deleteUserData(userId: string): Promise<void> {
    await AsyncStorage.removeItem(dataKey(userId));
  }
}

export const repository: Repository = new LocalRepository();
