import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { useHabit } from '@/hooks/use-data';
import { HabitForm } from '@/screens/habits/habit-form';

export default function EditHabitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabit(id);
  if (!habit) {
    return (
      <Screen title="Edit habit" back>
        <EmptyState icon="search-off" title="Habit not found" body="It may have been removed." actionLabel="Go back" onAction={() => goBack()} />
      </Screen>
    );
  }
  return <HabitForm habit={habit} />;
}
