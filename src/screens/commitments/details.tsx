import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { BreakdownBar, BreakdownLegend, ProgressBar, StatusDay } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { OBSTACLES } from '@/copy';
import { resumeCommitment } from '@/data/actions';
import { commitmentProgress, dailySeries, pct } from '@/domain/analytics';
import { dayOfMonth, endOfWeek, formatRange, formatShort, startOfWeek, weekdayIndex, weekdayLetter } from '@/domain/dates';
import type { DayStatus } from '@/domain/schedule';
import { useCommitment, useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow, recentConsistency } from '../goals/shared';
import { durationLabel, pledgeSentence, statusLabel } from './shared';

export function CommitmentDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commitment = useCommitment(id);
  const data = useData();
  const allHabits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const c = useColors();

  const progress = commitment ? commitmentProgress(commitment, allHabits, idx, today) : null;

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

  const habits = allHabits.filter((h) => commitment.habitIds.includes(h.id));
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
        <Banner
          tone="amber"
          icon="pause-circle-outline"
          body="Paused. Paused days are not counted. Resume whenever you're ready."
          action={<Button title="Resume" size="sm" icon="play-arrow" onPress={() => resumeCommitment(commitment.id)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />}
        />
      ) : null}

      <Card inset>
        <Row align="flex-start">
          <Icon name="format-quote" size={22} color={c.primaryText} />
          <Text variant="bodyLg" style={{ flex: 1 }}>
            {pledgeSentence(progress.totalDays ?? progress.day, null, habits)}
          </Text>
        </Row>
      </Card>

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
          title="Add a new habit to it"
          variant="ghost"
          icon="add"
          onPress={() => router.push(`/habit/new?commitmentId=${commitment.id}`)}
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
        <Stack>
          <Button
            title={reachedEnd ? 'See how it went' : 'End early'}
            variant={reachedEnd ? 'primary' : 'ghost'}
            icon={reachedEnd ? 'flag' : undefined}
            onPress={() => router.push(`/commitment/${commitment.id}/complete`)}
          />
          {!reachedEnd ? (
            <Text variant="bodySm" tone="tertiary" center>
              Ending early shows how it went so far. Your habits keep going either way.
            </Text>
          ) : null}
        </Stack>
      ) : (
        <Banner icon="history" body="This commitment is over. Its history is kept, and its habits carried on." />
      )}
    </Screen>
  );
}
