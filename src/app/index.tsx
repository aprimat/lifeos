import { Redirect } from 'expo-router';

import { useStore } from '@/data/store';

/** Entry for signed-in users: onboarding (plan v1.4 §8: straight to the first habit) or Today. (Signed-out users get (auth)/index — the welcome screen.) */
export default function Index() {
  const onboarded = useStore((s) => !!s.user?.onboardingCompletedAt);
  return <Redirect href={onboarded ? '/today' : '/start'} />;
}
