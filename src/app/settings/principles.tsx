import { View } from 'react-native';

import { Card, IconTile, Row } from '@/components/card';
import { Icon } from '@/components/icon';
import { PageTitle, SectionHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { SAFETY } from '@/copy';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

const PRINCIPLES = [
  {
    icon: 'spa',
    title: 'Start small',
    body: 'A small, achievable step beats an ambitious plan that falls apart. Every habit can have a minimum version for low-energy days.',
  },
  {
    icon: 'favorite-border',
    title: 'No guilt, no streaks',
    body: "LifeOS never counts streaks or resets your progress. A missed day is information, not failure — simply return the next day.",
  },
  {
    icon: 'bedtime',
    title: "Rest isn't failure",
    body: 'Planned rest days, travel and pauses are never counted as missed. They are part of a sustainable rhythm.',
  },
  {
    icon: 'insights',
    title: 'Honest measurement',
    body: 'Consistency is simply the sessions you did out of the sessions you planned. Full effort and the minimum version are always shown separately. There is no "life score" and no invented science.',
  },
  {
    icon: 'tune',
    title: "You're in control",
    body: 'Suggestions are optional and based on what you logged. LifeOS never changes a target or schedule without your approval.',
  },
  {
    icon: 'lock-outline',
    title: 'Private by default',
    body: 'Your goals, reasons and reflections are saved on this device and not shared. LifeOS does not track you.',
  },
];

export default function PrinciplesRoute() {
  const c = useColors();
  return (
    <Screen back title="LifeOS principles">
      <PageTitle title="How LifeOS works" subtitle="A calm, honest space for building the life you want — one small step at a time." />
      {PRINCIPLES.map((p) => (
        <Card key={p.title}>
          <Row align="flex-start" gap={spacing.md}>
            <IconTile tone="primary">
              <Icon name={p.icon} size={22} color={c.primaryText} />
            </IconTile>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="headlineSm">{p.title}</Text>
              <Text variant="bodyMd" tone="secondary">
                {p.body}
              </Text>
            </View>
          </Row>
        </Card>
      ))}

      <SectionHeader title="Support and safety" icon="health-and-safety" />
      <Card>
        <View style={{ gap: spacing.md }}>
          <Text variant="headlineSm">{SAFETY.title}</Text>
          <Text variant="bodyMd">{SAFETY.intro}</Text>
          <Text variant="bodyMd">{SAFETY.alcohol}</Text>
          <Text variant="bodyMd">{SAFETY.support('a behaviour like drinking, smoking, gambling or eating')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Icon name="emergency" size={20} color={c.error} />
            <Text variant="labelLg" style={{ flex: 1 }}>
              {SAFETY.crisis}
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
