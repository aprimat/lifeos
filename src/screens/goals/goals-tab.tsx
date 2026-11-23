import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, IconTile, Row, Stack } from '@/components/card';
import { Group, ListRow, SegmentedControl } from '@/components/controls';
import { Icon } from '@/components/icon';
import { EmptyState, Pill, SectionHeader } from '@/components/layout';
import { ProgressBar } from '@/components/progress';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { commitmentProgress, pct } from '@/domain/analytics';
import type { DataIndex } from '@/domain/schedule';
import type { Commitment, Goal, Habit } from '@/domain/types';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { focusIcon, HabitRow, recentConsistency } from './shared';

export function GoalsTab() {
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const goals = useMemo(
    () => data.goals.filter((g) => (tab === 'active' ? g.status === 'active' : g.status !== 'active')),
    [data.goals, tab],
  );
  const activeCount = data.goals.filter((g) => g.status === 'active').length;
  const standalone = habits.filter((h) => !h.goalId && !h.commitmentId && h.status !== 'archived');
  const isNew = data.goals.length === 0 && habits.length === 0;

  return (
    <Screen bare>
      <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
        <TabHeader section="Goals" />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="labelSm" tone="tertiary" uppercase>
          Directions
        </Text>
        <Text variant="headlineLg" accessibilityRole="header">
          Your goals
        </Text>
        <Text variant="bodyMd" tone="secondary">
          Long-term directions, shaped into daily practice.
        </Text>
      </View>

      {isNew ? (
        <EmptyState
          icon="flag"
          title="Start with one direction"
          body="A goal gives your habits a reason. You can also start with a single habit."
          actionLabel="Create a goal"
          onAction={() => router.push('/goal/new')}
        />
      ) : (
        <>
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: `Active (${activeCount})` },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          {goals.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" center style={{ paddingVertical: spacing.md }}>
              {tab === 'active' ? 'No active goals yet.' : 'Archived goals will appear here.'}
            </Text>
          ) : (
            goals.map((g) => <GoalCard key={g.id} goal={g} commitments={data.commitments} habits={habits} idx={idx} today={today} />)
          )}
        </>
      )}

      {tab === 'active' ? (
        <>
          <SectionHeader title="Standalone habits" right={standalone.length ? `${standalone.length}` : undefined} />
          {standalone.length === 0 ? (
            <Text variant="bodySm" tone="tertiary">
              Daily practices that aren&apos;t tied to a goal live here.
            </Text>
          ) : (
            <Stack>
              {standalone.map((h) => (
                <HabitRow key={h.id} habit={h} right={pct(recentConsistency(h, idx, today))} />
              ))}
            </Stack>
          )}
          <Card onPress={() => router.push('/habit/new')} accessibilityLabel="Add standalone habit" inset>
            <Row justify="center">
              <Icon name="add" size={20} />
              <Text variant="labelLg" tone="accent">
                Add standalone habit
              </Text>
            </Row>
          </Card>

          <SectionHeader title="Create" />
          <Group>
            <ListRow icon="flag" title="Create a goal" subtitle="Define a long-term direction" onPress={() => router.push('/goal/new')} />
            <ListRow icon="timer" title="Start a commitment" subtitle="A focused 30, 60 or 90-day period" onPress={() => router.push('/commitment/new')} />
            <ListRow icon="repeat" title="Add a habit" subtitle="One small, repeatable action" onPress={() => router.push('/habit/new')} />
          </Group>
        </>
      ) : null}
    </Screen>
  );
}

function GoalCard({
  goal,
  commitments,
  habits,
  idx,
  today,
}: {
  goal: Goal;
  commitments: Commitment[];
  habits: Habit[];
  idx: DataIndex;
  today: string;
}) {
  const c = useColors();
  const active = commitments.find((k) => k.goalId === goal.id && (k.status === 'active' || k.status === 'paused'));
  const draft = commitments.find((k) => k.goalId === goal.id && k.status === 'draft');
  const linked = habits.filter((h) => h.goalId === goal.id && h.status !== 'archived' && (!h.commitmentId || h.commitmentId === active?.id));
  const progress = active ? commitmentProgress(active, habits, idx, today) : null;

  return (
    <Card onPress={() => router.push(`/goal/${goal.id}`)} accessibilityLabel={goal.title}>
      <Stack gap={spacing.md}>
        <Row align="flex-start">
          <IconTile tone="primary">
            <Icon name={focusIcon(goal.focusArea)} color={c.primaryText} />
          </IconTile>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headlineSm">{goal.title}</Text>
            <Text variant="bodySm" tone="tertiary">
              {active
                ? `${active.status === 'paused' ? 'Paused' : 'Active'} commitment · ${active.durationDays ? `Day ${progress!.day} of ${active.durationDays}` : `Day ${progress!.day}`}`
                : [focusLabel(goal.focusArea), `${linked.length} habit${linked.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {goal.status !== 'active' ? <Pill label={goal.status === 'archived' ? 'Archived' : 'Concluded'} /> : null}
        </Row>

        {active && progress ? (
          <Stack gap={spacing.xs}>
            <Row justify="space-between">
              <Text variant="labelMd" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                {active.title}
              </Text>
              <Text variant="labelMd" tone="accent" tabular>
                {pct(progress.consistency)} consistency
              </Text>
            </Row>
            {progress.timeRatio !== null ? <ProgressBar value={progress.timeRatio} /> : null}
            {progress.daysRemaining !== null ? (
              <Text variant="labelMd" tone="tertiary" tabular>
                {progress.daysRemaining} days remaining
              </Text>
            ) : null}
          </Stack>
        ) : draft ? (
          <Pill label="Draft commitment — not started" tone="amber" icon="edit" />
        ) : null}

        {linked.length ? (
          <Stack gap={6}>
            {linked.slice(0, 4).map((h) => (
              <HabitRow key={h.id} habit={h} right={pct(recentConsistency(h, idx, today))} />
            ))}
            {linked.length > 4 ? (
              <Text variant="labelMd" tone="tertiary">
                +{linked.length - 4} more
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
