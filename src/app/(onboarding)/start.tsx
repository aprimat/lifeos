import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Row } from '@/components/card';
import { SelectableCard } from '@/components/controls';
import { PageTitle, Pill, StepHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { completeOnboarding } from '@/data/actions';
import { spacing } from '@/theme/tokens';

type Path = 'template' | 'commitment' | 'habit';

const PATHS: { value: Path; eyebrow: string; title: string; summary: string; description: string; icon: string; tags: string[] }[] = [
  {
    value: 'template',
    eyebrow: 'Good for beginners',
    title: 'Choose a template',
    summary: 'A ready-made starting point by focus area.',
    description: 'Includes a goal, a commitment and a few small habits — for example English practice, deep focus or better sleep. Everything stays editable.',
    icon: 'dashboard-customize',
    tags: ['6 templates', 'Quick setup'],
  },
  {
    value: 'commitment',
    eyebrow: 'Most flexible',
    title: 'Create a commitment',
    summary: 'Set a goal and a 30, 60 or 90-day commitment.',
    description: 'Choose your own habits to build or reduce, your schedule and any planned rest days.',
    icon: 'explore',
    tags: ['Your own plan', 'Flexible length'],
  },
  {
    value: 'habit',
    eyebrow: 'Lowest effort',
    title: 'Start with one habit',
    summary: 'Keep it simple with a single daily practice.',
    description: 'No goal or commitment needed. For example: 10 minutes of quiet in the morning, or no screens after 9:30 PM.',
    icon: 'radio-button-checked',
    tags: ['Under 2 minutes', 'Standalone'],
  },
];

/** Onboarding step 2 of 2 — choose a starting path (Stitch: choose_how_to_start). */
export default function StartRoute() {
  const [path, setPath] = useState<Path>('template');

  const go = () => {
    if (path === 'template') router.push('/templates?onboarding=1');
    else if (path === 'commitment') router.push('/goal/new?onboarding=1&next=commitment');
    else router.push('/habit/new?onboarding=1');
  };

  const later = async () => {
    await completeOnboarding();
    router.replace('/today');
  };

  return (
    <Screen
      back
      title="How to begin"
      footer={
        <View style={{ gap: spacing.xs }}>
          <Button title="Continue" iconRight="arrow-forward" onPress={go} testID="start-continue" />
          <Button title="Decide later" variant="ghost" onPress={later} testID="start-later" />
        </View>
      }>
      <StepHeader step={2} total={2} label="Starting path" />
      <PageTitle title="Choose how to begin" subtitle="Pick what feels right today. You can add more anytime." />
      {PATHS.map((p) => (
        <SelectableCard
          key={p.value}
          eyebrow={p.eyebrow}
          title={p.title}
          description={`${p.summary} ${p.description}`}
          icon={p.icon}
          selected={path === p.value}
          onPress={() => setPath(p.value)}
          testID={`path-${p.value}`}>
          <Row wrap gap={spacing.xs} style={{ marginTop: spacing.xs }}>
            {p.tags.map((t) => (
              <Pill key={t} label={t} tone={path === p.value ? 'primary' : 'neutral'} />
            ))}
          </Row>
        </SelectableCard>
      ))}
      <Text variant="bodySm" tone="tertiary" center>
        You can add goals, commitments and habits later from the Goals tab.
      </Text>
    </Screen>
  );
}
