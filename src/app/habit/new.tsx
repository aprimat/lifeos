import { useLocalSearchParams } from 'expo-router';

import type { HabitKind } from '@/domain/types';
import { HabitForm } from '@/screens/habits/habit-form';

export default function NewHabitRoute() {
  const p = useLocalSearchParams<{ kind?: string; commitmentId?: string; goalId?: string; onboarding?: string }>();
  return (
    <HabitForm
      kind={(p.kind === 'reduce' ? 'reduce' : 'build') as HabitKind}
      commitmentId={p.commitmentId || null}
      goalId={p.goalId || null}
      onboarding={p.onboarding === '1'}
    />
  );
}
