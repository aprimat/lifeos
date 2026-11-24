import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row, Stack } from '@/components/card';
import { Group, ListRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Pill, type Tone } from '@/components/layout';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { SAFETY, TIME_OF_DAY } from '@/copy';
import { archiveHabit, pauseHabit, resumeHabit } from '@/data/actions';
import { isAlcohol, type DayStatus, type Occurrence } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useCommitment, useGoal } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

export const STATUS_LABEL: Record<DayStatus, string> = {
  none: 'Not scheduled',
  rest: 'Planned rest',
  upcoming: 'Planned',
  full: 'Completed',
  minimum: 'Minimum version',
  partial: 'Partial',
  skipped: 'Skipped',
  rescheduled: 'Rescheduled',
  missed: 'Not logged',
  within: 'Within limit',
  over: 'Over limit',
  notLogged: 'Not logged',
};

export function statusTone(s: DayStatus): Tone {
  if (s === 'full' || s === 'within') return 'primary';
  if (s === 'minimum' || s === 'partial' || s === 'rest') return 'sage';
  if (s === 'over') return 'amber';
  return 'neutral';
}

/** Breadcrumb + title + "scheduled today" pill. */
export function HabitHeader({ habit, occ }: { habit: Habit; occ: Occurrence }) {
  const c = useColors();
  const goal = useGoal(habit.goalId ?? undefined);
  const commitment = useCommitment(habit.commitmentId ?? undefined);
  const tod = TIME_OF_DAY.find((t) => t.value === occ.version.timeOfDay);
  const flexible = occ.version.schedule.type === 'flexWeekly';
  const todayPill =
    habit.status === 'archived'
      ? { label: 'Archived', tone: 'neutral' as Tone }
      : habit.status === 'paused' || (occ.status === 'none' && habit.pauses.some((p) => p.end === null))
        ? { label: 'Paused', tone: 'neutral' as Tone }
        : occ.status === 'rest'
          ? { label: 'Rest day', tone: 'sage' as Tone }
          : flexible
            ? { label: 'Flexible this week', tone: 'primary' as Tone }
            : occ.planned
              ? { label: `Scheduled today${tod && tod.value !== 'anytime' ? ` · ${tod.label}` : ''}`, tone: 'sage' as Tone }
              : occ.status === 'rescheduled'
                ? { label: 'Moved from today', tone: 'neutral' as Tone }
                : { label: 'Not scheduled today', tone: 'neutral' as Tone };

  return (
    <Stack gap={spacing.md}>
      {goal || commitment ? (
        <Card
          inset
          onPress={() => (commitment ? router.push(`/commitment/${commitment.id}`) : router.push(`/goal/${goal!.id}`))}
          accessibilityLabel={commitment ? `Open commitment ${commitment.title}` : `Open goal ${goal?.title}`}>
          <Row gap={spacing.md}>
            <IconTile size={36}>
              <Icon name={commitment ? 'track-changes' : 'flag'} size={20} />
            </IconTile>
            <View style={{ flex: 1 }}>
              {goal ? (
                <Text variant="labelSm" tone="tertiary" uppercase numberOfLines={1}>
                  Goal · {goal.title}
                </Text>
              ) : null}
              <Text variant="bodyMd" numberOfLines={1}>
                {commitment ? commitment.title : goal?.title}
              </Text>
            </View>
            <Icon name="chevron-right" color={c.textTertiary} />
          </Row>
        </Card>
      ) : null}
      <Row gap={spacing.md} align="flex-start">
        <IconTile tone={habit.kind === 'reduce' ? 'amber' : 'primary'} size={56}>
          <Icon name={habit.icon} size={28} color={habit.kind === 'reduce' ? c.amber : c.primaryText} />
        </IconTile>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="headlineMd" accessibilityRole="header">
            {habit.title}
          </Text>
          <Pill label={todayPill.label} tone={todayPill.tone} />
        </View>
      </Row>
    </Stack>
  );
}

/** Edit / pause / archive. */
export function HabitActions({ habit }: { habit: Habit }) {
  const [confirm, setConfirm] = useState(false);
  const paused = habit.status === 'paused';
  if (habit.status === 'archived') {
    return (
      <Banner icon="inventory-2" body="This habit is archived. Its history is kept and still appears in your progress." />
    );
  }
  return (
    <>
      <Group>
        <ListRow title="Edit habit" subtitle="Target, schedule, reminder" icon="tune" onPress={() => router.push(`/habit/${habit.id}/edit`)} />
        <ListRow title="View progress" subtitle="Calendar, trends and reflections" icon="insights" onPress={() => router.push(`/habit/${habit.id}/progress`)} />
        <ListRow
          title={paused ? 'Resume habit' : 'Pause habit'}
          subtitle={paused ? 'Pick up again from today' : "Paused days don't count as missed"}
          icon={paused ? 'play-circle-outline' : 'pause-circle-outline'}
          onPress={() => (paused ? resumeHabit(habit.id) : pauseHabit(habit.id))}
        />
        <ListRow title="Archive habit" subtitle="Keeps all history" icon="inventory-2" onPress={() => setConfirm(true)} />
      </Group>
      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        title="Archive this habit?"
        body="It will stop appearing on Today. Everything you've logged stays in your history."
        confirmLabel="Archive"
        onConfirm={() => {
          archiveHabit(habit.id);
          setConfirm(false);
        }}
      />
    </>
  );
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text variant="bodyMd" tone="secondary">
        {body}
      </Text>
      <Button title={confirmLabel} onPress={onConfirm} />
      <Button title="Cancel" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}

export function SafetySheet({ visible, onClose, habit }: { visible: boolean; onClose: () => void; habit: Habit }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={SAFETY.title}>
      <Text variant="bodyMd">{SAFETY.intro}</Text>
      {isAlcohol(habit.title) ? <Banner icon="health-and-safety" tone="amber" body={SAFETY.alcohol} /> : null}
      <Text variant="bodyMd" tone="secondary">
        {SAFETY.support(habit.title.toLowerCase())}
      </Text>
      <Text variant="bodyMd" tone="secondary">
        {SAFETY.crisis}
      </Text>
      <Button title="Close" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

export function NotFound({ title = 'Habit not found' }: { title?: string }) {
  return (
    <Card>
      <Text variant="bodyMd" tone="secondary">
        {title}. It may have been removed.
      </Text>
    </Card>
  );
}
