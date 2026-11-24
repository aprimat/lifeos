import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cancelNotification, scheduleTimerEnd } from './notifications';

/**
 * Habit timer. State is stored as start time + accumulated ms (not a ticking counter),
 * so it survives backgrounding and app restarts. One timer at a time.
 */

export interface TimerState {
  habitId: string | null;
  habitTitle: string | null;
  date: string | null;
  targetMinutes: number;
  startedAt: number | null; // epoch ms while running
  accumulatedMs: number;
  notificationId: string | null;
  start(input: { habitId: string; habitTitle: string; date: string; targetMinutes: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<number>; // returns elapsed minutes
}

export const useTimer = create<TimerState>()(
  persist(
    (set, get) => ({
      habitId: null,
      habitTitle: null,
      date: null,
      targetMinutes: 0,
      startedAt: null,
      accumulatedMs: 0,
      notificationId: null,

      async start({ habitId, habitTitle, date, targetMinutes }) {
        const prev = get();
        if (prev.notificationId) await cancelNotification(prev.notificationId);
        const notificationId = await scheduleTimerEnd(habitTitle, targetMinutes * 60);
        set({ habitId, habitTitle, date, targetMinutes, startedAt: Date.now(), accumulatedMs: 0, notificationId });
      },

      async pause() {
        const s = get();
        if (!s.startedAt) return;
        if (s.notificationId) await cancelNotification(s.notificationId);
        set({ accumulatedMs: s.accumulatedMs + (Date.now() - s.startedAt), startedAt: null, notificationId: null });
      },

      async resume() {
        const s = get();
        if (s.startedAt || !s.habitId) return;
        const remaining = Math.max(0, s.targetMinutes * 60 - Math.floor(s.accumulatedMs / 1000));
        const notificationId = remaining > 0 ? await scheduleTimerEnd(s.habitTitle ?? '', remaining) : null;
        set({ startedAt: Date.now(), notificationId });
      },

      async stop() {
        const s = get();
        if (s.notificationId) await cancelNotification(s.notificationId);
        const ms = s.accumulatedMs + (s.startedAt ? Date.now() - s.startedAt : 0);
        set({ habitId: null, habitTitle: null, date: null, targetMinutes: 0, startedAt: null, accumulatedMs: 0, notificationId: null });
        return Math.round(ms / 60000);
      },
    }),
    {
      name: 'lifeos.timer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        habitId: s.habitId,
        habitTitle: s.habitTitle,
        date: s.date,
        targetMinutes: s.targetMinutes,
        startedAt: s.startedAt,
        accumulatedMs: s.accumulatedMs,
        notificationId: s.notificationId,
      }),
    },
  ),
);

export function elapsedMs(s: Pick<TimerState, 'startedAt' | 'accumulatedMs'>, now = Date.now()): number {
  return s.accumulatedMs + (s.startedAt ? now - s.startedAt : 0);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
