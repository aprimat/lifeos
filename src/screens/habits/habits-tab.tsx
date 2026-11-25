import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Group, ListRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { EmptyState, Pill } from '@/components/layout';
import { ProgressBar } from '@/components/progress';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { commitmentProgress, pct } from '@/domain/analytics';
import { formatShort } from '@/domain/dates';
import { runningCommitment, type DataIndex } from '@/domain/schedule';
import type { Goal, Habit, Milestone } from '@/domain/types';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { focusIcon, HabitRow, recentConsistency } from '../goals/shared';

/**
 * The Habits tab (plan v1.4 §3): every habit, grouped by the goals it supports,
 * with a "No goal" group last. Goals are optional; tapping a goal's header opens it.
 */
export function HabitsTab() {
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const [showDone, setShowDone] = useState(false);

  const live = useMemo(() => habits.filter((h) => h.status !== 'archived'), [habits]);
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  // Achieved goals keep their group while their habits are still running.
  const shownGoals = data.goals.filter(
    (g) => g.status === 'active' || ((g.status === 'achieved' || g.status === 'concluded') && live.some((h) => h.goalIds.includes(g.id))),
  );
  const doneGoals = data.goals.filter((g) => g.status !== 'active');
  const noGoal = live.filter((h) => !h.goalIds.some((id) => shownGoals.some((g) => g.id === id)));
  const archivedHabits = habits.filter((h) => h.status === 'archived');
  const running = runningCommitment(data.commitments, today);
  const isNew = live.length === 0 && activeGoals.length === 0;

  return (
    <Screen bare>
      <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
        <TabHeader section="Habits" />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="headlineLg" accessibilityRole="header">
          Your habits
        </Text>
        <Text variant="bodyMd" tone="secondary">
          What you repeat. Goals are optional.
        </Text>
      </View>

      {isNew ? (
        <>
          <EmptyState
            icon="repeat"
            title="What do you want to do regularly?"
            body="Start with one small habit. You can link it to a goal later."
            actionLabel="New habit"
            onAction={() => router.push('/habit/new')}
          />
          <Button title="Start from a template" variant="ghost" icon="auto-awesome" onPress={() => router.push('/templates')} />
        </>
      ) : (
        <>
          <Row gap={spacing.sm}>
            <Button title="New habit" icon="add" onPress={() => router.push('/habit/new')} style={{ flex: 1 }} />
            {running ? null : (
              <Button
                title="Make a commitment"
                variant="secondary"
                icon="track-changes"
                onPress={() => router.push('/commitment/new')}
                style={{ flex: 1 }}
              />
            )}
          </Row>
          {running ? <RunningCommitmentCard id={running.id} /> : null}

          {shownGoals.map((g) => (
            <GoalGroup
              key={g.id}
              goal={g}
              habits={live.filter((h) => h.goalIds.includes(g.id))}
              signs={data.milestones.filter((m) => m.ownerType === 'goal' && m.ownerId === g.id)}
              idx={idx}
              today={today}
            />
          ))}

          {noGoal.length ? (
            <Stack>
              <Text variant="labelSm" tone="secondary" uppercase accessibilityRole="header" style={{ marginTop: spacing.sm }}>
                {shownGoals.length ? 'No goal' : 'Habits'}
              </Text>
              {noGoal.map((h) => (
                <HabitRow key={h.id} habit={h} right={rightLabel(h, idx, today)} />
              ))}
            </Stack>
          ) : null}

          <Group>
            <ListRow icon="flag" title="Add a goal" subtitle="A result you want, e.g. Improve health" onPress={() => router.push('/goal/new')} />
          </Group>

          {doneGoals.length || archivedHabits.length ? (
            <Button
              title={showDone ? 'Hide achieved and archived' : `Achieved and archived (${doneGoals.length + archivedHabits.length})`}
              variant="ghost"
              icon={showDone ? 'expand-less' : 'expand-more'}
              onPress={() => setShowDone((v) => !v)}
            />
          ) : null}
          {showDone ? (
            <Stack>
              {doneGoals.map((g) => (
                <Card key={g.id} inset onPress={() => router.push(`/goal/${g.id}`)} accessibilityLabel={g.title}>
                  <Row>
                    <Icon name={g.status === 'archived' ? 'archive' : 'emoji-events'} size={20} />
                    <Text variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>
                      {g.title}
                    </Text>
                    <Pill
                      label={g.status === 'archived' ? 'Archived' : `Achieved${g.achievedAt ? ` ${formatShort(g.achievedAt)}` : ''}`}
                      tone={g.status === 'archived' ? 'neutral' : 'sage'}
                    />
                  </Row>
                </Card>
              ))}
              {archivedHabits.map((h) => (
                <HabitRow key={h.id} habit={h} right="Archived" />
              ))}
            </Stack>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function rightLabel(h: Habit, idx: DataIndex, today: string): string {
  if (h.status === 'paused' || h.pauses.some((p) => p.start <= today && (p.end === null || p.end >= today))) return 'Paused';
  return pct(recentConsistency(h, idx, today));
}

function GoalGroup({ goal, habits, signs, idx, today }: { goal: Goal; habits: Habit[]; signs: Milestone[]; idx: DataIndex; today: string }) {
  const c = useColors();
  const signsDone = signs.filter((m) => m.achievedAt).length;
  return (
    <Stack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Goal ${goal.title}, ${habits.length} habit${habits.length === 1 ? '' : 's'}${signs.length ? `, ${signsDone} of ${signs.length} signs achieved` : ''}`}
        onPress={() => router.push(`/goal/${goal.id}`)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, minHeight: 36, opacity: pressed ? 0.7 : 1 })}>
        <Icon name={focusIcon(goal.focusArea)} size={18} color={c.primaryText} />
        <Text variant="labelLg" tone="accent" numberOfLines={1} style={{ flex: 1 }}>
          {goal.title}
        </Text>
        {goal.status !== 'active' ? (
          <Pill label="Achieved" tone="sage" />
        ) : signs.length ? (
          <Pill label={`${signsDone} of ${signs.length} signs`} tone={signsDone === signs.length ? 'sage' : 'neutral'} icon="checklist" />
        ) : null}
        <Icon name="chevron-right" size={20} color={c.textTertiary} />
      </Pressable>
      {habits.map((h) => (
        <HabitRow key={h.id} habit={h} right={rightLabel(h, idx, today)} />
      ))}
      {habits.length === 0 ? (
        <Card inset onPress={() => router.push(`/habit/new?goalId=${goal.id}`)} accessibilityLabel={`Add a habit for ${goal.title}`}>
          <Row>
            <Icon name="add" size={20} />
            <Text variant="bodyMd" tone="secondary">
              No habits yet. Add one
            </Text>
          </Row>
        </Card>
      ) : null}
    </Stack>
  );
}

function RunningCommitmentCard({ id }: { id: string }) {
  const data = useData();
  const idx = useIndex();
  const today = useToday();
  const commitment = data.commitments.find((k) => k.id === id);
  if (!commitment) return null;
  const p = commitmentProgress(commitment, data.habits, idx, today);
  return (
    <Card onPress={() => router.push(`/commitment/${commitment.id}`)} accessibilityLabel={`Current commitment: ${commitment.title}`}>
      <Stack gap={spacing.xs}>
        <Text variant="labelSm" tone="accent" uppercase>
          {commitment.status === 'paused' ? 'Commitment paused' : 'Current commitment'}
        </Text>
        <Row justify="space-between">
          <Text variant="labelLg" numberOfLines={1} style={{ flex: 1 }}>
            {commitment.title}
          </Text>
          <Text variant="labelMd" tone="accent" tabular>
            {pct(p.consistency)}
          </Text>
        </Row>
        {p.timeRatio !== null ? <ProgressBar value={p.timeRatio} /> : null}
        <Text variant="labelMd" tone="tertiary" tabular>
          Day {p.day}
          {p.totalDays ? ` of ${p.totalDays}` : ''}
        </Text>
      </Stack>
    </Card>
  );
}
