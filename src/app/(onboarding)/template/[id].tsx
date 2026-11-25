import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row } from '@/components/card';
import { ChipGroup } from '@/components/controls';
import { Banner, EmptyState, Field, PageTitle, Pill, SectionHeader } from '@/components/layout';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { completeOnboarding } from '@/data/actions';
import { applyTemplate, getTemplate, type TemplateHabit } from '@/data/templates';
import { todayISO } from '@/domain/dates';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { describeTemplateHabit } from '@/screens/onboarding/describe';

/** Template setup (plan v1.4): a few questions and optional habits. It adds habits; a goal link is optional. */
export default function TemplateRoute() {
  const { id, goalId, onboarding } = useLocalSearchParams<{ id: string; goalId?: string; onboarding?: string }>();
  const t = getTemplate(id);
  const c = useColors();

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries((t?.questions ?? []).map((q) => [q.id, q.options[0]?.value ?? ''])),
  );
  const [optionalOn, setOptionalOn] = useState<string[]>([]);
  const [withGoal, setWithGoal] = useState(true);
  const creating = useRef(false);

  const habits = useMemo(() => (t ? t.habits(answers) : []), [t, answers]);

  if (!t) {
    return (
      <Screen back title="Template">
        <EmptyState icon="search-off" title="Template not found" body="It may have been removed. Choose another one." actionLabel="See templates" onAction={() => router.replace('/templates')} />
      </Screen>
    );
  }

  const included = habits.filter((h) => !h.optional || optionalOn.includes(h.key));

  const toggleOptional = (h: TemplateHabit) =>
    setOptionalOn((cur) => (cur.includes(h.key) ? cur.filter((k) => k !== h.key) : [...cur, h.key]));

  const create = async () => {
    if (creating.current) return;
    creating.current = true;
    applyTemplate(t.id, {
      answers,
      goalId: goalId ? goalId : withGoal ? undefined : null,
      startDate: todayISO(),
      includedKeys: included.map((h) => h.key),
    });
    if (onboarding) {
      await completeOnboarding();
      router.replace('/today');
    } else router.replace('/habits');
  };

  return (
    <Screen
      back
      title="Template"
      footer={
        <Button
          title={`Add ${included.length === 1 ? 'this habit' : `these ${included.length} habits`}`}
          icon="add"
          onPress={create}
          disabled={included.length === 0}
          testID="template-continue"
        />
      }>
      <Row gap={spacing.md}>
        <IconTile tone="primary" size={52}>
          <Icon name={t.icon} size={26} color={c.primaryText} />
        </IconTile>
        <View style={{ flex: 1 }}>
          <Pill label={focusLabel(t.focusArea)} tone="primary" />
        </View>
      </Row>
      <PageTitle title={t.title} subtitle={t.summary} />

      {t.questions.map((q) => (
        <Field key={q.id} label={q.label}>
          <ChipGroup
            options={q.options}
            value={answers[q.id] ?? null}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v as string }))}
          />
        </Field>
      ))}

      <SectionHeader title="Habits" right={`${included.length} included`} />
      {habits.map((h) => {
        const on = !h.optional || optionalOn.includes(h.key);
        return (
          <Card
            key={h.key}
            selected={h.optional ? on : undefined}
            onPress={h.optional ? () => toggleOptional(h) : undefined}
            accessibilityLabel={h.optional ? `${h.title}, optional, ${on ? 'included' : 'not included'}` : h.title}>
            <Row align="flex-start" gap={spacing.md}>
              <IconTile tone={h.kind === 'reduce' ? 'amber' : 'neutral'}>
                <Icon name={h.icon} size={22} color={h.kind === 'reduce' ? c.amber : c.textSecondary} />
              </IconTile>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={spacing.xs} wrap>
                  <Text variant="labelLg">{h.title}</Text>
                  {h.kind === 'reduce' ? <Pill label="Reduce" tone="amber" /> : null}
                  {h.optional ? <Pill label={on ? 'Included' : 'Optional'} tone={on ? 'primary' : 'neutral'} /> : null}
                </Row>
                <Text variant="bodySm" tone="secondary">
                  {describeTemplateHabit(h)}
                </Text>
                <Text variant="bodySm" tone="tertiary">
                  {h.description}
                </Text>
              </View>
              {h.optional ? <Icon name={on ? 'check-circle' : 'add-circle-outline'} size={24} color={on ? c.primary : c.textTertiary} /> : null}
            </Row>
          </Card>
        );
      })}

      {goalId ? null : (
        <Card selected={withGoal} onPress={() => setWithGoal((v) => !v)} accessibilityLabel={`Link these habits to the goal ${t.goalTitle}`}>
          <Row gap={spacing.md}>
            <Icon name={withGoal ? 'check-box' : 'check-box-outline-blank'} size={24} color={withGoal ? c.primary : c.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLg">Is this for a bigger goal?</Text>
              <Text variant="bodySm" tone="secondary">
                Link them to “{t.goalTitle}”. Optional, and you can change it later.
              </Text>
            </View>
          </Row>
        </Card>
      )}

      <Banner title="Starts today" body="The habits appear on Today straight away. Edit any of them later, or make a commitment from the Habits tab." />
    </Screen>
  );
}
