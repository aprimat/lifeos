import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row, Stack } from '@/components/card';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, PageTitle, Pill, SectionHeader, StepHeader } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { EXCEPTION_KINDS, TIME_OF_DAY } from '@/copy';
import { completeOnboarding, discardDraftCommitment, startCommitment } from '@/data/actions';
import { formatRange, minutesLabel, todayISO } from '@/domain/dates';
import { commitmentEndDate, currentVersion, runningCommitment } from '@/domain/schedule';
import { useCommitment, useData, useGoal } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { scheduleLabel, targetLabel } from '../goals/shared';
import { durationLabel, rhythmDays, startDateLabel, weeklyMinutes, WeekdayDots } from './shared';

export function CommitmentReview() {
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string }>();
  const commitment = useCommitment(id);
  const goal = useGoal(commitment?.goalId ?? undefined);
  const data = useData();
  const c = useColors();

  if (!commitment) {
    return (
      <Screen title="Review" back>
        <EmptyState icon="timer" title="Commitment not found" body="It may have been discarded." />
      </Screen>
    );
  }

  const isOnboarding = onboarding === '1';
  const habits = data.habits.filter((h) => commitment.habitIds.includes(h.id));
  const exceptions = data.exceptions.filter((e) => e.commitmentId === commitment.id);
  const milestones = data.milestones.filter((m) => m.ownerType === 'commitment' && m.ownerId === commitment.id);
  const end = commitmentEndDate(commitment);
  const days = rhythmDays(habits);
  const restDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !days.includes(d));
  const perWeek = weeklyMinutes(habits);
  const isDraft = commitment.status === 'draft';
  const other = runningCommitment(data.commitments, todayISO());
  const blocked = isDraft && !!other && other.id !== commitment.id;

  const start = async () => {
    startCommitment(commitment.id);
    if (isOnboarding) {
      await completeOnboarding();
      router.replace('/today');
    } else router.replace(`/commitment/${commitment.id}`);
  };

  return (
    <Screen
      title="Review"
      back={() => goBack(`/commitment/${commitment.id}/plan`)}
      footer={
        isDraft ? (
          <>
            <Button title="Start commitment" iconRight="arrow-forward" disabled={habits.length === 0 || blocked} onPress={start} />
            {blocked ? (
              <Text variant="bodySm" tone="secondary" center>
                “{other!.title}” is running. One commitment at a time: finish it first.
              </Text>
            ) : null}
            <Button
              title="Edit plan"
              variant="secondary"
              icon="edit"
              onPress={() => router.push(`/commitment/${commitment.id}/plan${isOnboarding ? '?onboarding=1' : ''}`)}
            />
          </>
        ) : (
          <Button title="View commitment" onPress={() => router.replace(`/commitment/${commitment.id}`)} />
        )
      }>
      {isDraft ? <StepHeader step={3} total={3} label="Review" /> : null}
      <PageTitle
        eyebrow="Plan review"
        title="Your commitment is ready."
        subtitle={`A ${commitment.durationDays ? `${commitment.durationDays}-day` : 'ongoing'} period of practice, at a pace you can keep.`}
      />

      {goal ? (
        <Card onPress={() => router.push(`/goal/${goal.id}`)} accessibilityLabel={`Goal: ${goal.title}`}>
          <Stack gap={4}>
            <Row>
              <Icon name="flag" size={16} color={c.primaryText} />
              <Text variant="labelSm" tone="accent" uppercase>
                Goal
              </Text>
            </Row>
            <Text variant="headlineSm">{goal.title}</Text>
            {goal.desiredOutcome ? (
              <Text variant="bodySm" tone="secondary">
                {goal.desiredOutcome}
              </Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={spacing.md}>
          <Stack gap={4}>
            <Text variant="labelSm" tone="tertiary" uppercase>
              Plan
            </Text>
            <Text variant="headlineSm">{commitment.title}</Text>
            <Row>
              <Icon name="event" size={16} />
              <Text variant="bodySm" tone="secondary">
                {end ? formatRange(commitment.startDate, end) : `Starts ${startDateLabel(commitment.startDate)}`} · {durationLabel(commitment.durationDays)}
              </Text>
            </Row>
          </Stack>
          <Stack>
            <Row justify="space-between">
              <Text variant="labelLg">Practice rhythm</Text>
              <Text variant="labelMd" tone="accent">
                {days.length} days / week
              </Text>
            </Row>
            <WeekdayDots days={days} />
          </Stack>
          {restDays.length ? (
            <Banner
              icon="spa"
              body={`${restDays.length === 2 && restDays[0] === 5 ? 'Saturday and Sunday are' : `${restDays.length} day${restDays.length === 1 ? ' is' : 's are'}`} planned rest. Rest days are part of the plan, never counted as missed.`}
            />
          ) : null}
          {exceptions.length ? (
            <Stack gap={4}>
              <Text variant="labelMd" tone="secondary">
                Planned exceptions
              </Text>
              {exceptions.map((e) => (
                <Text key={e.id} variant="bodySm" tone="secondary">
                  • {EXCEPTION_KINDS.find((k) => k.value === e.kind)?.label}: {formatRange(e.start, e.end)}
                </Text>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <SectionHeader title="Habits" right={`${habits.length}`} />
      {habits.map((h) => {
        const v = currentVersion(h);
        const time = TIME_OF_DAY.find((t) => t.value === v.timeOfDay)?.label;
        return (
          <Card key={h.id} onPress={() => router.push(`/habit/${h.id}/edit`)} accessibilityLabel={`${h.title}, edit`}>
            <Row align="flex-start">
              <IconTile tone={h.kind === 'reduce' ? 'amber' : 'primary'}>
                <Icon name={h.icon} color={h.kind === 'reduce' ? c.amber : c.primaryText} />
              </IconTile>
              <View style={{ flex: 1, gap: 4 }}>
                <Row justify="space-between" align="flex-start">
                  <Text variant="headlineSm" style={{ flex: 1 }}>
                    {h.title}
                  </Text>
                  {h.kind === 'reduce' ? <Pill label="Reduce" tone="amber" /> : null}
                </Row>
                <Text variant="bodySm" tone="secondary">
                  {targetLabel(h, v)} · {scheduleLabel(v.schedule)}
                  {v.timeOfDay !== 'anytime' ? ` · ${time}` : ''}
                </Text>
                {v.anchor ? (
                  <Row gap={6}>
                    <Icon name="anchor" size={14} />
                    <Text variant="bodySm" tone="tertiary">
                      {v.anchor}
                    </Text>
                  </Row>
                ) : null}
                {v.build?.minimum ? (
                  <Card inset padding={spacing.sm}>
                    <Text variant="bodySm" tone="secondary">
                      Low-energy version: {v.build.minimumLabel ?? `${v.build.minimum} ${v.build.unit}`}
                    </Text>
                  </Card>
                ) : null}
              </View>
            </Row>
          </Card>
        );
      })}

      {perWeek > 0 ? (
        <Card>
          <Stack>
            <Text variant="labelSm" tone="tertiary" uppercase>
              Weekly time
            </Text>
            <Text variant="headlineLg" tabular>
              ~{minutesLabel(perWeek)}{' '}
              <Text variant="bodyMd" tone="secondary">
                / week
              </Text>
            </Text>
            <Text variant="bodySm" tone="secondary">
              About {minutesLabel(Math.round(perWeek / Math.max(1, days.length)))} on each practice day.
            </Text>
          </Stack>
        </Card>
      ) : null}

      {milestones.length ? (
        <>
          <SectionHeader title="Milestones" />
          {milestones.map((m) => (
            <Row key={m.id}>
              <Icon name="outlined-flag" size={18} color={c.primaryText} />
              <Text variant="bodyMd">{m.title}</Text>
            </Row>
          ))}
        </>
      ) : null}

      <Banner tone="sage" icon="self-improvement" title="You can adjust your plan whenever life changes." body="Pause, reschedule or make a habit smaller at any time. Your history stays intact." />

      {isDraft ? (
        <Button
          title="Discard draft"
          variant="ghost"
          onPress={() => {
            discardDraftCommitment(commitment.id);
            goBack('/habits');
          }}
        />
      ) : null}
    </Screen>
  );
}
