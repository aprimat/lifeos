import { useLocalSearchParams } from 'expo-router';

import { ReflectionScreen } from '@/screens/reflection/reflection-screen';

export default function ReflectionRoute() {
  const { habitId, date } = useLocalSearchParams<{ habitId?: string; date?: string }>();
  return <ReflectionScreen habitId={habitId} date={date} />;
}
