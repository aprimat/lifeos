import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, IconTile, Row } from '@/components/card';
import { Icon } from '@/components/icon';
import { PageTitle, Pill, SectionHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { useStore } from '@/data/store';
import { TEMPLATES, type Template } from '@/data/templates';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { templateQuery } from '@/screens/onboarding/params';

/** Template picker. Params: goalId?, onboarding? */
export default function TemplatesRoute() {
  const params = useLocalSearchParams<{ goalId?: string; onboarding?: string }>();
  const focus = useStore((s) => s.user?.focusAreas ?? []);
  const c = useColors();

  const { matching, others } = useMemo(() => {
    const m = TEMPLATES.filter((t) => focus.includes(t.focusArea));
    return { matching: m, others: TEMPLATES.filter((t) => !m.includes(t)) };
  }, [focus]);

  const open = (t: Template) => router.push(`/template/${t.id}${templateQuery(params)}`);

  const renderCard = (t: Template) => {
    const habits = t.habits({}).filter((h) => !h.optional);
    return (
      <Card key={t.id} onPress={() => open(t)} accessibilityLabel={`${t.title} template`} testID={`template-${t.id}`}>
        <Row align="flex-start" gap={spacing.md}>
          <IconTile tone="primary">
            <Icon name={t.icon} size={22} color={c.primaryText} />
          </IconTile>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="headlineSm">{t.title}</Text>
            <Text variant="bodySm" tone="secondary">
              {t.summary}
            </Text>
            <Row wrap gap={spacing.xs} style={{ marginTop: spacing.xs }}>
              <Pill label={focusLabel(t.focusArea)} tone="primary" />
              <Pill label={`${t.durationDays} days`} />
              <Pill label={`${habits.length} habit${habits.length === 1 ? '' : 's'}`} />
            </Row>
          </View>
          <Icon name="chevron-right" size={22} color={c.textTertiary} />
        </Row>
      </Card>
    );
  };

  return (
    <Screen back title="Templates">
      <PageTitle
        title="Pick a starting point"
        subtitle="Templates suggest a goal, a commitment and a few small habits. You can change anything before you start."
      />
      {matching.length > 0 ? (
        <>
          <SectionHeader title="For your focus areas" />
          {matching.map(renderCard)}
          <SectionHeader title="More templates" />
        </>
      ) : null}
      {others.map(renderCard)}
    </Screen>
  );
}
