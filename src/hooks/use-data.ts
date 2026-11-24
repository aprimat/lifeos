import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useStore } from '@/data/store';
import { todayISO } from '@/domain/dates';
import { buildIndex, type DataIndex } from '@/domain/schedule';
import type { Commitment, Goal, Habit, ID, UserData } from '@/domain/types';

/** Today's local date; updates at midnight and when the app returns to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const tick = () => setToday((prev) => (prev === todayISO() ? prev : todayISO()));
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}

export function useData(): UserData {
  return useStore((s) => s.data);
}

export function useIndex(): DataIndex {
  const habits = useStore((s) => s.data.habits);
  const commitments = useStore((s) => s.data.commitments);
  const logs = useStore((s) => s.data.logs);
  const exceptions = useStore((s) => s.data.exceptions);
  return useMemo(() => buildIndex({ habits, commitments, logs, exceptions }), [habits, commitments, logs, exceptions]);
}

export function useGoal(id: ID | undefined): Goal | undefined {
  return useStore((s) => s.data.goals.find((g) => g.id === id));
}

export function useCommitment(id: ID | undefined): Commitment | undefined {
  return useStore((s) => s.data.commitments.find((c) => c.id === id));
}

export function useHabit(id: ID | undefined): Habit | undefined {
  return useStore((s) => s.data.habits.find((h) => h.id === id));
}

/** Habits that can appear on Today / Progress (not archived; draft commitments excluded). */
export function useLiveHabits(): Habit[] {
  const habits = useStore((s) => s.data.habits);
  const commitments = useStore((s) => s.data.commitments);
  return useMemo(() => {
    const drafts = new Set(commitments.filter((c) => c.status === 'draft').map((c) => c.id));
    return habits.filter((h) => !(h.commitmentId && drafts.has(h.commitmentId)));
  }, [habits, commitments]);
}
