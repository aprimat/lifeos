import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ChipGroup, SelectableCard, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Field, PageTitle, StepHeader } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { createCommitment, createGoal } from '@/data/actions';
import { addDays, todayISO } from '@/domain/dates';
import { useData } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { focusIcon } from '../goals/shared';
import { DurationPicker, nextMonday, startDateLabel } from './shared';

type Approach = 'template' | 'own';

export function NewCommitment() {
  const params = useLocalSearchParams<{ goalId?: string; onboarding?: string }>();
  const onboarding = params.onboarding === '1';
  const ob = onboarding ? '&onboarding=1' : '';
  const data = useData();
  const c = useColors();
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const [goalId, setGoalId] = useState<string | null>(params.goalId ?? activeGoals[0]?.id ?? null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [pickingGoal, setPickingGoal] = useState(!params.goalId);
  const goal = data.goals.find((g) => g.id === goalId);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number | null>(30);
  const today = todayISO();
  const startOptions = useMemo(() => {
    const opts = [
      { value: today, label: 'Today' },
      { value: addDays(today, 1), label: 'Tomorrow' },
    ];
    const mon = nextMonday(today);
    if (mon !== addDays(today, 1)) opts.push({ value: mon, label: 'Next Monday' });
    return opts;
  }, [today]);
  const [startDate, setStartDate] = useState(today);
  const [approach, setApproach] = useState<Approach>('own');

  const hasGoal = !!goal || !!newGoalTitle.trim();
  const canContinue = hasGoal && (approach === 'template' || !!title.trim());

  // Coming back from the next step and pressing Continue again reuses the goal created
  // the first time instead of making a duplicate.
  const createdGoal = useRef<{ title: string; id: string } | null>(null);
  const resolveGoal = (): string => {
    if (goal && (!pickingGoal || !newGoalTitle.trim())) return goal.id;
    const t = newGoalTitle.trim();
    if (createdGoal.current?.title === t && data.goals.some((g) => g.id === createdGoal.current!.id)) return createdGoal.current.id;
    const id = createGoal({ title: t, focusArea: null, myWhy: null, desiredOutcome: null });
    createdGoal.current = { title: t, id };
    return id;
  };

  const onContinue = () => {
    const gid = resolveGoal();
    if (approach === 'template') {
      router.push(`/templates?goalId=${gid}${ob}`);
      return;
    }
    const id = createCommitment({ goalId: gid, title: title.trim(), startDate, durationDays: duration });
    router.replace(`/commitment/${id}/plan${onboarding ? '?onboarding=1' : ''}`);
  };

  return (
    <Screen
      title="New commitment"
      back={() => goBack('/goals')}
      footer={<Button title="Continue" iconRight="arrow-forward" disabled={!canContinue} onPress={onContinue} />}>
      <StepHeader step={1} total={3} label="Commitment" />
      <PageTitle title="Make a commitment to yourself." subtitle="A commitment is a focused period of action toward a goal." />

      <Field label="Goal">
        {goal && !pickingGoal ? (
          <Card inset onPress={() => setPickingGoal(true)} accessibilityLabel={`Goal: ${goal.title}. Change`}>
            <Row>
              <Icon name={focusIcon(goal.focusArea)} size={20} color={c.primaryText} />
              <Text variant="labelLg" style={{ flex: 1 }}>
                {goal.title}
              </Text>
              <Text variant="labelMd" tone="accent">
                Change
              </Text>
            </Row>
          </Card>
        ) : (
          <Stack>
            {activeGoals.length ? (
              <ChipGroup
                options={activeGoals.map((g) => ({ value: g.id, label: g.title, icon: focusIcon(g.focusArea) }))}
                value={newGoalTitle.trim() ? null : goalId}
                onChange={(v) => {
                  setGoalId(v as string);
                  setNewGoalTitle('');
                  setPickingGoal(false);
                }}
              />
            ) : null}
            <TextField
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              placeholder={activeGoals.length ? 'Or name a new goal' : 'Name the goal, e.g. Improve my English'}
              maxLength={80}
              accessibilityLabel="New goal"
            />
          </Stack>
        )}
      </Field>

      <Field label="Starting approach">
        <Stack>
          <SelectableCard
            icon="auto-awesome-mosaic"
            title="Use a suggested template"
            description="Starter habits and milestones you can adjust before starting."
            selected={approach === 'template'}
            onPress={() => setApproach('template')}
          />
          <SelectableCard
            icon="edit"
            title="Build my own"
            description="Choose your own habits and rhythm."
            selected={approach === 'own'}
            onPress={() => setApproach('own')}
          />
        </Stack>
      </Field>

      {approach === 'own' ? (
        <>
          <Field label="Commitment name">
            <TextField value={title} onChangeText={setTitle} placeholder="e.g. Practice English consistently" maxLength={80} accessibilityLabel="Commitment name" />
          </Field>
          <Field label="Duration">
            <DurationPicker value={duration} onChange={setDuration} />
          </Field>
          <Field label="Start date" hint={startDateLabel(startDate)}>
            <ChipGroup options={startOptions} value={startDate} onChange={(v) => setStartDate(v as string)} />
          </Field>
        </>
      ) : (
        <Text variant="bodySm" tone="tertiary" style={{ paddingHorizontal: spacing.xs }}>
          You&apos;ll pick a template next, then set its length and start date.
        </Text>
      )}
    </Screen>
  );
}
