import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
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
import { useStore } from '@/data/store';
import { useHabitCommitment } from '@/hooks/use-data';
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
  const allGoals = useStore((st) => st.data.goals);
  const goals = allGoals.filter((g) => habit.goalIds.includes(g.id));
  const latest = useHabitCommitment(habit.id);
  const commitment = latest && (latest.status === 'active' || latest.status === 'paused') ? latest : undefined;
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
      {commitment ? (
        <Card inset onPress={() => router.push(`/commitment/${commitment.id}`)} accessibilityLabel={`Open commitment ${commitment.title}`}>
          <Row gap={spacing.md}>
            <IconTile size={36}>
              <Icon name="track-changes" size={20} />
            </IconTile>
            <View style={{ flex: 1 }}>
              <Text variant="labelSm" tone="tertiary" uppercase numberOfLines={1}>
                Commitment
              </Text>
              <Text variant="bodyMd" numberOfLines={1}>
                {commitment.title}
              </Text>
            </View>
            <Icon name="chevron-right" color={c.textTertiary} />
          </Row>
        </Card>
      ) : null}
      {goals.length ? (
        <Row wrap gap={spacing.sm}>
          {goals.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={`Open goal ${g.title}`}
              onPress={() => router.push(`/goal/${g.id}`)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: 18, backgroundColor: c.inset, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="flag" size={16} color={c.primaryText} />
              <Text variant="labelMd" numberOfLines={1}>
                {g.title}
              </Text>
            </Pressable>
          ))}
        </Row>
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

/** Shown in the body of an archived habit's details. */
export function ArchivedBanner({ habit }: { habit: Habit }) {
  if (habit.status !== 'archived') return null;
  return <Banner icon="inventory-2" body="This habit is archived. Its history is kept and still appears in your progress." />;
}

/**
 * "⋯" button for the top bar: edit / progress / pause / archive in one sheet.
 * The archive confirmation reuses the same sheet so two modals never stack.
 */
export function HabitMenu({ habit }: { habit: Habit }) {
  const [mode, setMode] = useState<'closed' | 'menu' | 'archive'>('closed');
  const archived = habit.status === 'archived';
  const paused = habit.status === 'paused';
  const close = () => setMode('closed');
  const go = (path: string) => {
    close();
    router.push(path as never);
  };

  return (
    <>
      <IconButton
        icon={Platform.OS === 'ios' ? 'more-horiz' : 'more-vert'}
        accessibilityLabel="Habit actions"
        onPress={() => setMode('menu')}
      />
      <Sheet
        visible={mode !== 'closed'}
        onClose={close}
        title={mode === 'archive' ? 'Archive this habit?' : habit.title}>
        {mode === 'archive' ? (
          <>
            <Text variant="bodyMd" tone="secondary">
              It will stop appearing on Today. Everything you&apos;ve logged stays in your history.
            </Text>
            <Button
              title="Archive"
              onPress={() => {
                archiveHabit(habit.id);
                close();
              }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setMode('menu')} />
          </>
        ) : (
          <Group>
            {!archived ? (
              <ListRow title="Edit habit" subtitle="Target, schedule, reminder" icon="tune" onPress={() => go(`/habit/${habit.id}/edit`)} />
            ) : null}
            <ListRow
              title="View progress"
              subtitle="Calendar, trends and reflections"
              icon="insights"
              onPress={() => go(`/habit/${habit.id}/progress`)}
            />
            {!archived ? (
              <>
                <ListRow
                  title={paused ? 'Resume habit' : 'Pause habit'}
                  subtitle={paused ? 'Pick up again from today' : "Paused days don't count as missed"}
                  icon={paused ? 'play-circle-outline' : 'pause-circle-outline'}
                  onPress={() => {
                    if (paused) resumeHabit(habit.id);
                    else pauseHabit(habit.id);
                    close();
                  }}
                />
                <ListRow title="Archive habit" subtitle="Keeps all history" icon="inventory-2" onPress={() => setMode('archive')} />
              </>
            ) : null}
            <ListRow title="Profile & settings" icon="settings" onPress={() => go('/settings')} />
          </Group>
        )}
      </Sheet>
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
