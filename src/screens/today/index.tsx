import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Chip } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { ProgressBar, WeekStrip } from '@/components/progress';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { DISPOSITIONS, greeting, TIME_OF_DAY } from '@/copy';
import { dismissPrompt } from '@/data/actions';
import { useStore } from '@/data/store';
import { commitmentProgress, dailyCompletion, dailySeries, dayPlan, flexibleForDay, pct } from '@/domain/analytics';
import { addDays, diffDays, endOfWeek, formatLong, formatShort, startOfWeek, weekdayIndex } from '@/domain/dates';
import { commitmentDay, commitmentEndDate, occurrence, scheduleMatches, type Occurrence } from '@/domain/schedule';
import { useTimer } from '@/services/timer';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow } from './habit-row';
import { LogSheet, type LogTarget } from './log-sheet';

const EDIT_WINDOW_DAYS = 7;

export function TodayScreen() {
  const c = useColors();
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState<LogTarget | null>(null);
  const user = useStore((s) => s.user);
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();

  // Follow the calendar when the day changes, unless a timer is still running for the
  // selected day (a session started before midnight is logged to the day it began).
  const timerDate = useTimer((t) => (t.habitId ? t.date : null));
  const [shownToday, setShownToday] = useState(today);
  if (shownToday !== today) {
    setShownToday(today);
    if (timerDate !== selected) setSelected(today);
  }

  const weekStart = startOfWeek(today);
  const series = useMemo(() => dailySeries(habits, weekStart, endOfWeek(today), idx, today), [habits, idx, today, weekStart]);
  const plan = useMemo(() => dayPlan(habits, selected, idx, today), [habits, selected, idx, today]);
  const completion = useMemo(() => dailyCompletion(habits, selected, idx, today), [habits, selected, idx, today]);
  const flex = useMemo(() => flexibleForDay(habits, selected, idx, today), [habits, selected, idx, today]);
  const restItems = useMemo(
    () =>
      habits
        .map((h) => occurrence(h, selected, idx, today))
        .filter((o) => o.status === 'rest' && o.version.schedule.type !== 'flexWeekly' && scheduleMatches(o.version.schedule, selected)),
    [habits, selected, idx, today],
  );

  const age = diffDays(selected, today);
  const editable = selected <= today && age <= EDIT_WINDOW_DAYS;
  const isToday = selected === today;

  // Planned items grouped by time of day. A running commitment is one line above them (plan v1.4 §3).
  const timeGroups = useMemo(
    () => TIME_OF_DAY.map((t) => ({ ...t, items: plan.filter((o) => o.version.timeOfDay === t.value) })).filter((g) => g.items.length),
    [plan],
  );
  const commitment = data.commitments.find((k) => {
    if (k.status !== 'active' && k.status !== 'paused') return false;
    const end = commitmentEndDate(k);
    return k.startDate <= selected && (!end || selected <= end);
  });
  const commitmentStats = commitment ? commitmentProgress(commitment, habits, idx, today) : null;

  // Yesterday's unlogged items (optional, dismissible).
  const yesterday = addDays(today, -1);
  const yesterdayMissed = useMemo(
    () => habits.map((h) => occurrence(h, yesterday, idx, today)).filter((o) => o.status === 'missed' || o.status === 'notLogged'),
    [habits, yesterday, idx, today],
  );
  const showYesterday = isToday && yesterdayMissed.length > 0 && !data.dismissedPrompts.includes(`yesterday:${yesterday}`);

  // Commitments that reached their end date and still await a look back (plan 7.3).
  const finished = data.commitments.filter((k) => {
    const end = commitmentEndDate(k);
    return k.status === 'active' && !!end && end < today;
  });

  // Weekly review prompt: Mon–Wed, if last week isn't reviewed and there was a plan last week.
  const lastWeek = addDays(weekStart, -7);
  const reviewed = data.weeklyReviews.some((r) => r.weekStart === lastWeek && r.completedAt);
  const hadPlanLastWeek = habits.some((h) => h.startDate <= addDays(lastWeek, 6));
  const showReview = isToday && weekdayIndex(today) <= 2 && !reviewed && hadPlanLastWeek && !data.dismissedPrompts.includes(`review:${lastWeek}`);

  const checkIn = data.checkIns.find((x) => x.date === selected);

  const open = (o: { habit: Occurrence['habit']; version: Occurrence['version']; log?: Occurrence['log'] }, initialValue?: number) => {
    if (!editable) return;
    setSheet({ habit: o.habit, version: o.version, date: selected, log: o.log, initialValue });
  };

  const allDone = completion.total > 0 && completion.done === completion.total;

  return (
    <Screen bare testID="today-screen">
      <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
        <TabHeader section="Today" />
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="labelMd" tone="tertiary" uppercase>
          {formatLong(today)}
        </Text>
        <Text variant="headlineLg" accessibilityRole="header">
          {greeting(user?.name ?? '')}
        </Text>
      </View>

      {habits.length === 0 ? (
        <EmptyStart />
      ) : (
        <>
          <Card padding={spacing.sm}>
            <WeekStrip days={series} selected={selected} today={today} onSelect={setSelected} />
          </Card>

          {commitment && commitmentStats ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Your commitment: day ${Math.max(1, commitmentDay(commitment, selected))}${commitment.durationDays ? ` of ${commitment.durationDays}` : ''}, ${pct(commitmentStats.consistency)} kept. Open`}
              onPress={() => router.push(`/commitment/${commitment.id}`)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: 12, backgroundColor: c.primarySoft, opacity: pressed ? 0.8 : 1 })}>
              <Icon name="track-changes" size={18} color={c.primaryText} />
              <Text variant="labelLg" tone="accent" tabular style={{ flex: 1 }}>
                {commitment.status === 'paused' ? 'Commitment paused · ' : ''}Day {Math.max(1, commitmentDay(commitment, selected))}
                {commitment.durationDays ? ` of ${commitment.durationDays}` : ''}
                {commitmentStats.consistency !== null ? ` · ${pct(commitmentStats.consistency)} kept` : ''}
              </Text>
              <Icon name="chevron-right" size={18} color={c.primaryText} />
            </Pressable>
          ) : null}

          {!isToday ? (
            <Banner
              icon={selected > today ? 'event' : 'history'}
              title={formatLong(selected)}
              body={
                selected > today
                  ? 'This is what is planned. You can log it on the day.'
                  : editable
                    ? 'You can still log or correct this day.'
                    : 'This day is read-only now. History stays as it was.'
              }
              action={
                <Pressable accessibilityRole="button" onPress={() => setSelected(today)} style={{ paddingVertical: 6 }}>
                  <Text variant="labelLg" tone="accent">
                    Back to today
                  </Text>
                </Pressable>
              }
            />
          ) : null}

          {showReview ? (
            <Banner
              tone="primary"
              icon="event-note"
              title="Your weekly review is ready"
              body={`A few calm minutes to look back on the week of ${formatShort(lastWeek)}.`}
              action={
                <Row gap={spacing.md} style={{ marginTop: 6 }}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/weekly-review?week=${lastWeek}`)} style={{ paddingVertical: 6 }}>
                    <Text variant="labelLg" tone="accent">
                      Start review
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => dismissPrompt(`review:${lastWeek}`)} style={{ paddingVertical: 6 }}>
                    <Text variant="labelLg" tone="tertiary">
                      Later
                    </Text>
                  </Pressable>
                </Row>
              }
            />
          ) : null}

          <Card>
            <Row justify="space-between">
              <Text variant="labelSm" tone="secondary" uppercase>
                Daily plan
              </Text>
              {completion.ratio !== null ? (
                <Text variant="labelLg" tone="accent" tabular>
                  {Math.round(completion.ratio * 100)}%
                </Text>
              ) : null}
            </Row>
            {completion.total > 0 ? (
              <>
                <Text variant="headlineMd" tabular style={{ marginTop: spacing.xs }}>
                  {completion.done} of {completion.total} completed
                </Text>
                <View style={{ marginVertical: spacing.sm }}>
                  <ProgressBar value={completion.ratio ?? 0} />
                </View>
                <Row gap={6}>
                  <Icon name="spa" size={16} color={c.sage} />
                  <Text variant="bodySm" tone="secondary">
                    {allDone ? "Today's plan is done. Nicely paced." : 'Paced for steady consistency, not pressure.'}
                  </Text>
                </Row>
              </>
            ) : (
              <Text variant="bodyMd" tone="secondary" style={{ marginTop: spacing.xs }}>
                {restItems.length ? 'A planned rest day. Rest is part of the rhythm.' : 'Nothing scheduled for this day. Enjoy the space.'}
              </Text>
            )}
          </Card>

          {isToday
            ? finished.map((k) => (
                <Card key={k.id} selected onPress={() => router.push(`/commitment/${k.id}/complete`)} accessibilityLabel={`Look back on ${k.title}`}>
                  <Row align="flex-start" gap={spacing.md}>
                    <Icon name="flag" size={22} color={c.primaryText} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="labelLg">{k.title} has reached its end date</Text>
                      <Text variant="bodySm" tone="secondary">
                        See how it went and choose what comes next. Your habits keep going.
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={c.textTertiary} />
                  </Row>
                </Card>
              ))
            : null}

          {showYesterday ? (
            <Card inset>
              <Row align="flex-start" gap={spacing.md}>
                <Icon name="history" size={20} color={c.textSecondary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="labelLg">
                    Yesterday had {yesterdayMissed.length} unlogged {yesterdayMissed.length === 1 ? 'item' : 'items'}
                  </Text>
                  <Text variant="bodySm" tone="secondary">
                    Log what happened, or note what got in the way. Both are optional.
                  </Text>
                  <Row gap={spacing.md} style={{ marginTop: 4 }}>
                    <Pressable accessibilityRole="button" onPress={() => setSelected(yesterday)} style={{ paddingVertical: 6 }}>
                      <Text variant="labelLg" tone="accent">
                        Log yesterday
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/reflection?habitId=${yesterdayMissed[0].habit.id}&date=${yesterday}`)}
                      style={{ paddingVertical: 6 }}>
                      <Text variant="labelLg" tone="accent">
                        Reflect
                      </Text>
                    </Pressable>
                  </Row>
                </View>
                <IconButton icon="close" accessibilityLabel="Dismiss" onPress={() => dismissPrompt(`yesterday:${yesterday}`)} />
              </Row>
            </Card>
          ) : null}


          {timeGroups.length ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Daily habits" right={`${timeGroups.flatMap((g) => g.items).filter((o) => o.done).length} of ${timeGroups.flatMap((g) => g.items).length} done`} />
              {timeGroups.map((g) => (
                <View key={g.value} style={{ gap: spacing.sm }}>
                  {timeGroups.length > 1 || g.value !== 'anytime' ? (
                    <SectionHeader title={g.label} icon={g.icon} right={`${g.items.filter((o) => o.done).length} of ${g.items.length}`} />
                  ) : null}
                  {g.items.map((o) => (
                    <HabitRow key={o.habit.id} occ={o} date={selected} today={today} editable={editable} onOpen={(v) => open(o, v)} />
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {flex.length ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="This week" icon="date-range" right="Any day works" />
              {flex.map(({ habit, week, log }) => {
                const o = occurrence(habit, selected, idx, today);
                const note = `${week.done} of ${week.target}${week.extra ? ` · +${week.extra}` : ''}`;
                return (
                  <HabitRow key={habit.id} occ={{ ...o, log }} date={selected} today={today} editable={editable} note={note} onOpen={(v) => open({ ...o, log }, v)} />
                );
              })}
            </View>
          ) : null}

          {restItems.length ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Resting today" icon="bedtime" />
              <Card inset>
                <Stack gap={6}>
                  {restItems.map((o) => (
                    <Row key={o.habit.id} gap={spacing.sm}>
                      <Icon name="bedtime" size={16} color={c.sage} />
                      <Text variant="bodyMd" tone="secondary" style={{ flex: 1 }}>
                        {o.habit.title}
                      </Text>
                      <Text variant="labelMd" tone="tertiary">
                        Rest day
                      </Text>
                    </Row>
                  ))}
                </Stack>
              </Card>
            </View>
          ) : null}

          {isToday ? (
            checkIn ? (
              <Card onPress={() => router.push(`/check-in?date=${today}`)} accessibilityLabel="Edit today's check-in">
                <Row gap={spacing.md}>
                  <Icon name="wb-twilight" size={22} color={c.sage} />
                  <View style={{ flex: 1 }}>
                    <Text variant="labelLg">Checked in today</Text>
                    <Text variant="bodySm" tone="secondary">
                      {[
                        DISPOSITIONS.find((d) => d.value === checkIn.disposition)?.label,
                        checkIn.energy ? `Energy ${checkIn.energy}/5` : null,
                        checkIn.stress ? `Stress ${checkIn.stress}/5` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Saved'}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={c.textTertiary} />
                </Row>
              </Card>
            ) : (
              <Card>
                <Row gap={spacing.sm} justify="space-between">
                  <Row gap={spacing.sm}>
                    <Icon name="wb-twilight" size={22} color={c.sage} />
                    <Text variant="headlineSm">Daily check-in</Text>
                  </Row>
                  <Pill label="Optional" />
                </Row>
                <Text variant="bodyMd" tone="secondary" style={{ marginVertical: spacing.sm }}>
                  How are you feeling right now?
                </Text>
                <Row wrap gap={spacing.sm}>
                  {DISPOSITIONS.map((d) => (
                    <Chip key={d.value} small label={d.label} icon={d.icon} onPress={() => router.push(`/check-in?date=${today}&disposition=${d.value}`)} />
                  ))}
                </Row>
              </Card>
            )
          ) : null}

          <Row gap={spacing.sm} justify="center" wrap style={{ marginTop: spacing.sm }}>
            <Button size="sm" variant="secondary" icon="add" title="Add a habit" onPress={() => router.push('/habit/new')} />
          </Row>
        </>
      )}

      <LogSheet target={sheet} today={today} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function EmptyStart() {
  return (
    <View style={{ gap: spacing.md }}>
      <EmptyState
        icon="wb-sunny"
        title="A calm place to begin"
        body="Nothing is planned yet. Start with one small step — you can always add more later."
      />
      <Button title="Add a habit" icon="add" onPress={() => router.push('/habit/new')} />
      <Button variant="secondary" title="Start a commitment" icon="flag" onPress={() => router.push('/commitment/new')} />
      <Button variant="secondary" title="Create a goal" icon="explore" onPress={() => router.push('/goal/new')} />
    </View>
  );
}

