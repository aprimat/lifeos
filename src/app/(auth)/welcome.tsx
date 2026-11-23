import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row } from '@/components/card';
import { Icon } from '@/components/icon';
import { Pill } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

const PRINCIPLES = [
  {
    icon: 'swap-horiz',
    tone: 'primary' as const,
    title: 'From goal to rhythm',
    tag: 'Core',
    body: 'Turn a long-term direction into small, repeatable daily actions.',
  },
  {
    icon: 'timelapse',
    tone: 'sage' as const,
    title: 'Time-bound commitments',
    tag: '30 · 60 · 90 days',
    body: 'Focused periods that fit real life, with room to renew or adjust.',
  },
  {
    icon: 'favorite-border',
    tone: 'amber' as const,
    title: 'Kind by design',
    tag: 'No streaks',
    body: 'Consistency over fragile streaks. A missed day is information, not failure.',
  },
];

export default function WelcomeRoute() {
  const c = useColors();
  return (
    <Screen
      bare
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button title="Get started" iconRight="arrow-forward" onPress={() => router.push('/sign-up')} testID="get-started" />
          <Row justify="center" gap={spacing.xs}>
            <Text variant="bodyMd" tone="secondary">
              Already have an account?
            </Text>
            <Pressable accessibilityRole="link" accessibilityLabel="Sign in" hitSlop={12} onPress={() => router.push('/sign-in')}>
              <Text variant="labelLg" tone="accent">
                Sign in
              </Text>
            </Pressable>
          </Row>
        </View>
      }>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon name="radio-button-checked" size={30} color={c.primaryText} />
        </View>
        <Pill label="LifeOS · Small steps" tone="primary" />
        <Text variant="display" center accessibilityRole="header">
          Build a better life, one day at a time.
        </Text>
        <Text variant="bodyLg" tone="secondary" center>
          A quiet space to set meaningful goals, make focused commitments, and build daily habits without the noise.
        </Text>
      </View>

      <LinearGradient
        colors={[c.primarySoft, c.sageSoft, c.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.panel, { borderColor: c.border }]}>
        <View style={[styles.panelTag, { backgroundColor: c.card }]}>
          <Icon name="spa" size={18} color={c.sage} />
          <Text variant="labelLg">Designed for calm and clarity</Text>
        </View>
      </LinearGradient>

      {PRINCIPLES.map((p) => (
        <Card key={p.title}>
          <Row align="flex-start" gap={spacing.md}>
            <IconTile tone={p.tone}>
              <Icon name={p.icon} size={22} color={p.tone === 'primary' ? c.primaryText : p.tone === 'sage' ? c.sage : c.amber} />
            </IconTile>
            <View style={{ flex: 1, gap: 4 }}>
              <Row justify="space-between" align="flex-start">
                <Text variant="headlineSm" style={{ flex: 1 }}>
                  {p.title}
                </Text>
                <Text variant="labelSm" uppercase tone={p.tone === 'primary' ? 'accent' : p.tone === 'sage' ? 'sage' : 'amber'}>
                  {p.tag}
                </Text>
              </Row>
              <Text variant="bodyMd" tone="secondary">
                {p.body}
              </Text>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  logo: { width: 72, height: 72, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { height: 160, borderRadius: radius.xl, borderWidth: 1, justifyContent: 'flex-end', padding: spacing.md },
  panelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
});
