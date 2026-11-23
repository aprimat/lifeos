import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row } from '@/components/card';
import { ChipGroup } from '@/components/controls';
import { Banner, EmptyState, Field, PageTitle, Pill, SectionHeader } from '@/components/layout';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { applyTemplate, getTemplate, type TemplateHabit } from '@/data/templates';
import { addDays, formatShort, todayISO, weekdayIndex } from '@/domain/dates';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { describeTemplateHabit } from '@/screens/onboarding/describe';

type StartChoice = 'today' | 'tomorrow' | 'monday';
type DurationChoice = '30' | '60' | '90' | 'ongoing';

/** Template setup: a few questions, optional habits, length and start date. */
export default function TemplateRoute() {
  const { id, goalId, onboarding } = useLocalSearchParams<{ id: string; goalId?: string; onboarding?: string }>();
  const t = getTemplate(id);
  const c = useColors();

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries((t?.questions ?? []).map((q) => [q.id, q.options[0]?.value ?? ''])),
  );
  const [optionalOn, setOptionalOn] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationChoice>(String(t?.durationDays ?? 30) as DurationChoice);
  const [start, setStart] = useState<StartChoice>('today');

  const habits = useMemo(() => (t ? t.habits(answers) : []), [t, answers]);

  if (!t) {
    return (
      <Screen back title="Template">
        <EmptyState icon="search-off" title="Template not found" body="It may have been removed. Choose another one." actionLabel="See templates" onAction={() => router.replace('/templates')} />
      </Screen>
    );
  }

  const today = todayISO();
  const nextMonday = addDays(today, 7 - weekdayIndex(today));
  const startDate = start === 'today' ? today : start === 'tomorrow' ? addDays(today, 1) : nextMonday;
  const included = habits.filter((h) => !h.optional || optionalOn.includes(h.key));

  const toggleOptional = (h: TemplateHabit) =>
    setOptionalOn((cur) => (cur.includes(h.key) ? cur.filter((k) => k !== h.key) : [...cur, h.key]));

  const create = () => {
    const commitmentId = applyTemplate(t.id, {
      answers,
      goalId: goalId ?? null,
      startDate,
      durationDays: duration === 'ongoing' ? null : Number(duration),
      includedKeys: included.map((h) => h.key),
    });
    router.replace(`/commitment/${commitmentId}/review${onboarding ? '?onboarding=1' : ''}`);
  };

  return (
    <Screen
      back
      title="Template"
      footer={<Button title="Review plan" iconRight="arrow-forward" onPress={create} disabled={included.length === 0} testID="template-continue" />}>
      <Row gap={spacing.md}>
        <IconTile tone="primary" size={52}>
          <Icon name={t.icon} size={26} color={c.primaryText} />
        </IconTile>
        <View style={{ flex: 1 }}>
          <Pill label={focusLabel(t.focusArea)} tone="primary" />
        </View>
      </Row>
      <PageTitle title={t.title} subtitle={t.summary} />
      <Card inset>
        <Text variant="labelSm" tone="tertiary" uppercase>
          Goal
        </Text>
        <Text variant="bodyLg">{t.goalTitle}</Text>
        <Text variant="labelSm" tone="tertiary" uppercase style={{ marginTop: spacing.sm }}>
          Commitment
        </Text>
        <Text variant="bodyLg">{t.commitmentTitle}</Text>
      </Card>

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

      <Field label="Length">
        <ChipGroup<DurationChoice>
          options={[
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
            { value: '90', label: '90 days' },
            { value: 'ongoing', label: 'Ongoing' },
          ]}
          value={duration}
          onChange={(v) => setDuration(v as DurationChoice)}
        />
      </Field>

      <Field label="Start" hint={`Starts ${formatShort(startDate)}.`}>
        <ChipGroup<StartChoice>
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'monday', label: `Next Monday (${formatShort(nextMonday)})` },
          ]}
          value={start}
          onChange={(v) => setStart(v as StartChoice)}
        />
      </Field>

      <Banner title="Nothing starts yet" body="Next you'll see the full plan and can adjust habits, schedule and rest days before you begin." />
    </Screen>
  );
}
