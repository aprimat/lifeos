import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { useHabit } from '@/hooks/use-data';
import { BuildHabitDetails } from '@/screens/habits/build-details';
import { ReduceHabitDetails } from '@/screens/habits/reduce-details';

export default function HabitDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabit(id);
  if (!habit) {
    return (
      <Screen title="Habit details" back>
        <EmptyState icon="search-off" title="Habit not found" body="It may have been removed." actionLabel="Go back" onAction={() => goBack()} />
      </Screen>
    );
  }
  return habit.kind === 'reduce' ? <ReduceHabitDetails habit={habit} /> : <BuildHabitDetails habit={habit} />;
}
