import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Icon } from '@/components/icon';
import { EmptyState, Pill } from '@/components/layout';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { consistency, habitsBreakdown, pct } from '@/domain/analytics';
import { addDays, formatShort } from '@/domain/dates';
import type { DataIndex } from '@/domain/schedule';
import type { Goal, Habit, Milestone } from '@/domain/types';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { focusIcon } from './shared';

const WINDOW_DAYS = 28;

/**
 * The Goals tab (plan v1.4): results you want, each with its signs and the habits behind it.
 * Goals are optional; achieved and let-go goals are kept below, folded away.
 */
export function GoalsTab() {
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const [open, setOpen] = useState<'achieved' | 'letGo' | null>(null);

  const active = data.goals.filter((g) => g.status === 'active');
  const achieved = data.goals.filter((g) => g.status === 'achieved' || g.status === 'concluded');
  const letGo = data.goals.filter((g) => g.status === 'archived');
  const signsFor = (g: Goal) => data.milestones.filter((m) => m.ownerType === 'goal' && m.ownerId === g.id);
  const habitsFor = (g: Goal) => habits.filter((h) => h.status !== 'archived' && h.goalIds.includes(g.id));

  return (
    <Screen bare>
      <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
        <TabHeader title="Goals" />
      </View>
      <View style={{ gap: spacing.xs, marginTop: -spacing.sm }}>
        <Text variant="bodyMd" tone="secondary">
          Results you want. Optional: habits work without them.
        </Text>
      </View>

      {active.length === 0 && achieved.length === 0 && letGo.length === 0 ? (
        <EmptyState
          icon="flag"
          title="Got something bigger in mind?"
          body="A goal is a result you want, like “Be healthy”. Add a few signs that show it's achieved and link the habits that help."
          actionLabel="Add a goal"
          onAction={() => router.push('/goal/new')}
        />
      ) : (
        <>
          <Button title="Add a goal" icon="add" onPress={() => router.push('/goal/new')} />
          {active.length === 0 ? (
            <Text variant="bodyMd" tone="secondary">
              No active goals right now.
            </Text>
          ) : null}
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} signs={signsFor(g)} habits={habitsFor(g)} idx={idx} today={today} />
          ))}

          <Folded
            title="Achieved"
            icon="emoji-events"
            goals={achieved}
            open={open === 'achieved'}
            onToggle={() => setOpen((o) => (o === 'achieved' ? null : 'achieved'))}
            label={(g) => `Achieved${g.achievedAt ? ` ${formatShort(g.achievedAt)}` : ''}`}
            tone="sage"
          />
          <Folded
            title="Let go"
            icon="spa"
            goals={letGo}
            open={open === 'letGo'}
            onToggle={() => setOpen((o) => (o === 'letGo' ? null : 'letGo'))}
            label={() => 'Let go'}
            tone="neutral"
          />
        </>
      )}
    </Screen>
  );
}

function GoalCard({ goal, signs, habits, idx, today }: { goal: Goal; signs: Milestone[]; habits: Habit[]; idx: DataIndex; today: string }) {
  const c = useColors();
  const signsDone = signs.filter((m) => m.achievedAt).length;
  const recent = habitsBreakdown(habits, addDays(today, -(WINDOW_DAYS - 1)), today, idx, today);
  const rate = recent.eligible > 0 ? consistency(recent) : null;
  const summary = [
    `${habits.length} habit${habits.length === 1 ? '' : 's'}`,
    signs.length ? `${signsDone} of ${signs.length} signs` : null,
    rate !== null ? `${pct(rate)} last 4 weeks` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card onPress={() => router.push(`/goal/${goal.id}`)} accessibilityLabel={`Goal ${goal.title}. ${summary}`}>
      <Row gap={spacing.md}>
        <Icon name={focusIcon(goal.focusArea)} size={22} color={c.primaryText} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelLg" numberOfLines={2}>
            {goal.title}
          </Text>
          <Text variant="bodySm" tone="secondary">
            {summary}
          </Text>
        </View>
        {signs.length && signsDone === signs.length ? <Pill label="All signs" tone="sage" icon="checklist" /> : null}
        <Icon name="chevron-right" size={20} color={c.textTertiary} />
      </Row>
    </Card>
  );
}

function Folded({
  title,
  icon,
  goals,
  open,
  onToggle,
  label,
  tone,
}: {
  title: string;
  icon: string;
  goals: Goal[];
  open: boolean;
  onToggle: () => void;
  label: (g: Goal) => string;
  tone: 'sage' | 'neutral';
}) {
  if (!goals.length) return null;
  return (
    <Stack>
      <Button title={`${title} (${goals.length})`} variant="ghost" icon={open ? 'expand-less' : 'expand-more'} onPress={onToggle} />
      {open
        ? goals.map((g) => (
            <Card key={g.id} inset onPress={() => router.push(`/goal/${g.id}`)} accessibilityLabel={`${g.title}, ${label(g)}`}>
              <Row>
                <Icon name={icon} size={20} />
                <Text variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>
                  {g.title}
                </Text>
                <Pill label={label(g)} tone={tone} />
              </Row>
            </Card>
          ))
        : null}
    </Stack>
  );
}
