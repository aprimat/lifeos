import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Group, ListRow, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Field, Pill, SectionHeader } from '@/components/layout';
import { BreakdownBar, BreakdownLegend, ProgressBar, StatusDay } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { OBSTACLES } from '@/copy';
import {
  endCommitment,
  extendCommitment,
  pauseCommitment,
  resumeCommitment,
  setMilestoneAchieved,
  updateCommitment,
} from '@/data/actions';
import { commitmentProgress, dailySeries, pct } from '@/domain/analytics';
import { dayOfMonth, endOfWeek, formatRange, formatShort, startOfWeek, weekdayIndex, weekdayLetter } from '@/domain/dates';
import type { DayStatus } from '@/domain/schedule';
import { useCommitment, useData, useGoal, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow, recentConsistency } from '../goals/shared';
import { ConfirmButtons, DurationPicker, durationLabel, statusLabel } from './shared';

export function CommitmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commitment = useCommitment(id);
  const goal = useGoal(commitment?.goalId ?? undefined);
  const data = useData();
  const allHabits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const c = useColors();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number | null>(30);

  const progress = commitment ? commitmentProgress(commitment, allHabits, idx, today) : null;
  const milestones = commitment ? data.milestones.filter((m) => m.ownerType === 'commitment' && m.ownerId === commitment.id) : [];

  // Session-based milestones are recorded automatically by syncMilestones (root layout).
  const done = progress?.breakdown.done ?? 0;

  if (!commitment || !progress) {
    return (
      <Screen title="Commitment" back>
        <EmptyState icon="timer" title="Commitment not found" body="It may have been removed." />
      </Screen>
    );
  }

  if (commitment.status === 'draft') {
    return (
      <Screen title="Commitment" back>
        <EmptyState
          icon="edit"
          title="This commitment hasn't started"
          body="Finish planning it, then start when you're ready."
          actionLabel="Continue planning"
          onAction={() => router.replace(`/commitment/${commitment.id}/plan`)}
        />
      </Screen>
    );
  }

  const habits = allHabits.filter((h) => h.commitmentId === commitment.id);
  const habitIds = new Set(habits.map((h) => h.id));
  const reflections = data.reflections
    .filter((r) => habitIds.has(r.habitId) && (r.note || r.helpNextTime))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const isRunning = commitment.status === 'active' || commitment.status === 'paused';
  const reachedEnd = commitment.status === 'active' && progress.endDate !== null && today > progress.endDate;
  const week = dailySeries(habits, startOfWeek(today), endOfWeek(today), idx, today);
  const b = progress.breakdown;

  const weekStatus = (d: (typeof week)[number]): DayStatus => {
    if (d.planned === 0) return d.rest ? 'rest' : 'none';
    if (d.date >= today && d.done < d.planned) return 'upcoming';
    if (d.done >= d.planned) return 'full';
    if (d.done > 0) return 'partial';
    return 'missed';
  };

  return (
    <Screen title="Commitment" back>
      <Stack gap={spacing.xs}>
        {goal ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`Goal: ${goal.title}`} onPress={() => router.push(`/goal/${goal.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
            <Icon name="flag" size={16} color={c.primaryText} />
            <Text variant="labelMd" tone="accent">
              {goal.title}
            </Text>
            <Icon name="chevron-right" size={16} color={c.primaryText} />
          </Pressable>
        ) : null}
        <Row justify="space-between" align="flex-start">
          <Text variant="headlineLg" style={{ flex: 1 }} accessibilityRole="header">
            {commitment.title}
          </Text>
          <Pill label={statusLabel(commitment)} tone={commitment.status === 'active' ? 'sage' : commitment.status === 'paused' ? 'amber' : 'neutral'} />
        </Row>
        <Row>
          <Icon name="event" size={16} />
          <Text variant="bodySm" tone="secondary">
            {durationLabel(commitment.durationDays)} · {progress.endDate ? formatRange(commitment.startDate, progress.endDate) : `since ${formatShort(commitment.startDate)}`}
          </Text>
        </Row>
      </Stack>

      {reachedEnd ? (
        <Banner
          tone="primary"
          icon="celebration"
          title="Your commitment has reached its end date"
          body="Take a moment to look back, then choose what comes next."
          action={<Button title="Review and decide" size="sm" onPress={() => router.push(`/commitment/${commitment.id}/complete`)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />}
        />
      ) : null}
      {commitment.status === 'paused' ? (
        <Banner tone="amber" icon="pause-circle-outline" body="Paused. Paused days are not counted. Resume whenever you're ready." />
      ) : null}

      <Card>
        <Stack gap={spacing.md}>
          <Row justify="space-between">
            <Text variant="labelLg">Progress</Text>
            <Text variant="labelLg" tone="accent" tabular>
              Day {progress.day}
              {progress.totalDays ? ` of ${progress.totalDays}` : ''}
            </Text>
          </Row>
          {progress.timeRatio !== null ? (
            <Stack gap={4}>
              <ProgressBar value={progress.timeRatio} />
              <Row justify="space-between">
                <Text variant="labelMd" tone="tertiary" tabular>
                  {Math.round(progress.timeRatio * 100)}% of the way
                </Text>
                <Text variant="labelMd" tone="tertiary" tabular>
                  {progress.daysRemaining} days remaining
                </Text>
              </Row>
            </Stack>
          ) : null}
          <Row gap={spacing.sm} align="stretch">
            <Card inset style={{ flex: 1 }}>
              <Text variant="labelSm" tone="tertiary" uppercase>
                Consistency
              </Text>
              <Text variant="headlineLg" tabular>
                {pct(progress.consistency)}
              </Text>
              <Text variant="bodySm" tone="secondary">
                of planned sessions so far
              </Text>
            </Card>
            <Card inset style={{ flex: 1 }}>
              <Text variant="labelSm" tone="tertiary" uppercase>
                Sessions
              </Text>
              <Text variant="headlineLg" tabular>
                {b.done}
                <Text variant="bodyMd" tone="secondary">
                  {progress.plannedTotal !== null ? ` / ${progress.plannedTotal}` : ''}
                </Text>
              </Text>
              <Text variant="bodySm" tone="secondary">
                {progress.plannedTotal !== null ? 'done of planned' : 'done so far'}
              </Text>
            </Card>
          </Row>
          {b.eligible > 0 ? (
            <Stack>
              <BreakdownBar b={b} />
              <BreakdownLegend b={b} />
            </Stack>
          ) : null}
          {b.rest > 0 ? (
            <Row>
              <Icon name="spa" size={16} color={c.sage} />
              <Text variant="bodySm" tone="secondary">
                {b.rest} planned rest day{b.rest === 1 ? '' : 's'} taken.
              </Text>
            </Row>
          ) : null}
        </Stack>
      </Card>

      <SectionHeader title="Habits" right={`${habits.length}`} />
      <Stack>
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} right={pct(recentConsistency(h, idx, today, 365))} />
        ))}
      </Stack>
      {isRunning ? (
        <Button
          title="Add linked habit"
          variant="ghost"
          icon="add"
          onPress={() => router.push(`/habit/new?commitmentId=${commitment.id}${commitment.goalId ? `&goalId=${commitment.goalId}` : ''}`)}
        />
      ) : null}

      <Card>
        <Stack>
          <Row justify="space-between">
            <Text variant="labelLg">This week</Text>
            <Text variant="labelMd" tone="tertiary">
              {formatRange(startOfWeek(today), endOfWeek(today))}
            </Text>
          </Row>
          <Row justify="space-between">
            {week.map((d) => (
              <View key={d.date} style={{ alignItems: 'center', gap: 4 }}>
                <Text variant="labelMd" tone={d.date === today ? 'accent' : 'tertiary'}>
                  {weekdayLetter(weekdayIndex(d.date))}
                </Text>
                <Text variant="labelSm" tone="tertiary" tabular>
                  {dayOfMonth(d.date)}
                </Text>
                <StatusDay status={weekStatus(d)} size={32} label={d.date} />
              </View>
            ))}
          </Row>
        </Stack>
      </Card>

      {milestones.length ? (
        <>
          <SectionHeader title="Milestones" right={`${milestones.filter((m) => m.achievedAt).length} of ${milestones.length} reached`} />
          <Card>
            <Stack>
              {milestones.map((m) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!m.achievedAt }}
                  accessibilityLabel={m.title}
                  onPress={() => setMilestoneAchieved(m.id, !m.achievedAt)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
                  <Icon name={m.achievedAt ? 'check-circle' : 'radio-button-unchecked'} size={22} color={m.achievedAt ? c.sage : c.idle} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">{m.title}</Text>
                    <Text variant="labelMd" tone="tertiary">
                      {m.achievedAt
                        ? `Reached ${formatShort(m.achievedAt)}`
                        : m.targetSessions
                          ? `${Math.min(done, m.targetSessions)} of ${m.targetSessions} sessions`
                          : 'Tap when reached'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Stack>
          </Card>
        </>
      ) : null}

      {reflections.length ? (
        <>
          <SectionHeader title="Reflections" />
          {reflections.map((r) => {
            const h = habits.find((x) => x.id === r.habitId);
            return (
              <Card key={r.id}>
                <Stack gap={4}>
                  <Row justify="space-between">
                    <Text variant="labelMd" tone="tertiary">
                      {formatShort(r.date)} · {h?.title}
                    </Text>
                    {r.obstacles[0] ? <Pill label={OBSTACLES.find((o) => o.value === r.obstacles[0])?.label ?? ''} /> : null}
                  </Row>
                  {r.note ? <Text variant="bodyMd">“{r.note}”</Text> : null}
                  {r.helpNextTime ? (
                    <Text variant="bodySm" tone="secondary">
                      Next time: {r.helpNextTime}
                    </Text>
                  ) : null}
                </Stack>
              </Card>
            );
          })}
        </>
      ) : null}

      {isRunning ? (
        <>
          <SectionHeader title="Adjust" />
          <Group>
            <ListRow
              icon="tune"
              title="Edit commitment"
              subtitle="Name and length"
              onPress={() => {
                setTitle(commitment.title);
                setDuration(commitment.durationDays);
                setEditOpen(true);
              }}
            />
            <ListRow icon="event-busy" title="Plan exceptions" subtitle="Travel, holidays, rest days" onPress={() => router.push(`/commitment/${commitment.id}/plan`)} />
            {commitment.status === 'paused' ? (
              <ListRow icon="play-circle-outline" title="Resume commitment" onPress={() => resumeCommitment(commitment.id)} />
            ) : (
              <ListRow icon="pause-circle-outline" title="Pause commitment" subtitle="Paused days aren't counted" onPress={() => pauseCommitment(commitment.id)} />
            )}
            {commitment.durationDays ? (
              <>
                <ListRow icon="update" title="Extend by 7 days" onPress={() => extendCommitment(commitment.id, 7)} />
                <ListRow icon="date-range" title="Extend by 30 days" onPress={() => extendCommitment(commitment.id, 30)} />
              </>
            ) : null}
            <ListRow icon="flag" title="Finish and review" onPress={() => router.push(`/commitment/${commitment.id}/complete`)} />
          </Group>
          <Button title="Archive or end early" variant="ghost" onPress={() => setArchiveOpen(true)} />
        </>
      ) : (
        <Banner icon="history" body={`This commitment is ${commitment.status}. Its history is kept.`} />
      )}

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit commitment">
        <Field label="Name">
          <TextField value={title} onChangeText={setTitle} maxLength={80} accessibilityLabel="Commitment name" />
        </Field>
        <Field label="Duration">
          <DurationPicker value={duration} onChange={setDuration} />
        </Field>
        <Button
          title="Save"
          disabled={!title.trim()}
          onPress={() => {
            updateCommitment(commitment.id, { title: title.trim(), durationDays: duration });
            setEditOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={archiveOpen} onClose={() => setArchiveOpen(false)} title="End this commitment early?">
        <Text variant="bodyMd" tone="secondary">
          Your history and progress are kept. Linked habits stop appearing on Today. The goal stays active.
        </Text>
        <ConfirmButtons
          confirm={{
            title: 'Archive commitment',
            danger: true,
            onPress: () => {
              endCommitment(commitment.id, 'archived');
              setArchiveOpen(false);
            },
          }}
          cancel={() => setArchiveOpen(false)}
        />
      </Sheet>
    </Screen>
  );
}
