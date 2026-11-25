import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Group, ListRow } from '@/components/controls';
import { PageTitle } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { completeOnboarding } from '@/data/actions';
import { spacing } from '@/theme/tokens';

/**
 * Onboarding (plan v1.4 §8): one question, then the first habit. No goal, commitment
 * or focus-area questions are required; those are all optional, later, from the Habits tab.
 */
export default function StartRoute() {
  const later = async () => {
    await completeOnboarding();
    router.replace('/today');
  };

  return (
    <Screen
      title="Welcome"
      footer={
        <View style={{ gap: spacing.xs }}>
          <Button title="Create my first habit" icon="add" onPress={() => router.push('/habit/new?onboarding=1')} testID="start-continue" />
          <Button title="Decide later" variant="ghost" onPress={later} testID="start-later" />
        </View>
      }>
      <PageTitle
        eyebrow="LifeOS"
        title="What do you want to do regularly?"
        subtitle="Small habits add up. Start with one; you can link it to a bigger goal later if you like."
      />
      <Group>
        <ListRow
          icon="edit"
          title="My own habit"
          subtitle="e.g. read 20 minutes, walk 8,000 steps, no screens after 9:30 PM"
          onPress={() => router.push('/habit/new?onboarding=1')}
        />
        <ListRow
          icon="dashboard-customize"
          title="Pick from templates"
          subtitle="Small habits for English, focus, sleep, movement and more"
          onPress={() => router.push('/templates?onboarding=1')}
        />
      </Group>
      <Text variant="bodySm" tone="tertiary" center>
        Goals are optional. Add them any time from the Goals tab.
      </Text>
    </Screen>
  );
}
