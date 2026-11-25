import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Chip } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { dayMark, dayMarkLabel, ProgressBar } from '@/components/progress';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { DISPOSITIONS, TIME_OF_DAY } from '@/copy';
import { dismissPrompt } from '@/data/actions';
import { dailyCompletion, dailySeries, dayPlan, flexibleForDay } from '@/domain/analytics';
import { addDays, endOfMonth, formatShort, formatShortDay, startOfMonth, startOfWeek, weekdayIndex } from '@/domain/dates';
import { commitmentEndDate, occurrence, scheduleMatches, type Occurrence } from '@/domain/schedule';
import { FEATURES } from '@/features';
import { useTimer } from '@/services/timer';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow } from './habit-row';
import { LogSheet, type LogTarget } from './log-sheet';
import { StepRow } from './step-row';
import { useDoneLast } from './use-done-last';
import { StepSheet } from '../goals/step-sheet';
import { stepsForDay } from '@/domain/steps';
import type { Step } from '@/domain/types';
import { WeekPager } from './week-pager';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { MonthCalendar } from '../habits/month-calendar';
import { Sheet } from '@/components/sheet';


export function TodayScreen() {
  const c = useColors();
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState<LogTarget | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editStep, setEditStep] = useState<Step | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today);
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
  const monthSeries = useMemo(
    () => (calendarOpen ? dailySeries(habits, startOfMonth(calendarMonth), endOfMonth(calendarMonth), idx, today) : []),
    [calendarOpen, habits, calendarMonth, idx, today],
  );
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

  // Any past day can be logged: forgetting to log is normal and shouldn't be punished.
  const editable = selected <= today;
  const isToday = selected === today;

  // One list in time-of-day order; done habits move to the bottom after a short pause.
  const byTime = useMemo(
    () => TIME_OF_DAY.flatMap((t) => plan.filter((o) => o.version.timeOfDay === t.value)),
    [plan],
  );
  const orderedPlan = useDoneLast(byTime, (o) => o.habit.id, (o) => o.done, selected);
  const daySteps = useMemo(() => stepsForDay(data.steps, data.goals, selected, today), [data.steps, data.goals, selected, today]);
  const orderedSteps = useDoneLast(daySteps, (x) => x.step.id, (x) => !!x.step.doneAt, selected);
  const orderedFlex = useDoneLast(flex, (f) => f.habit.id, (f) => !!f.log && (f.log.status === 'full' || f.log.status === 'minimum' || f.log.status === 'partial'), selected);
  // Yesterday's unlogged items (optional, dismissible).
  const yesterday = addDays(today, -1);
  const yesterdayMissed = useMemo(
    () => habits.map((h) => occurrence(h, yesterday, idx, today)).filter((o) => o.status === 'missed' || o.status === 'notLogged'),
    [habits, yesterday, idx, today],
  );
  const showYesterday = isToday && yesterdayMissed.length > 0 && !data.dismissedPrompts.includes(`yesterday:${yesterday}`);

  // Commitments that reached their end date and still await a look back (plan 7.3).
  const finished = data.commitments.filter((k) => {
    if (!FEATURES.commitments) return false;
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

  return (
    <Screen
      bare
      testID="today-screen"
      header={
        <>
          <TabHeader
            title={`${formatShortDay(selected)}${selected.slice(0, 4) !== today.slice(0, 4) ? `, ${selected.slice(0, 4)}` : ''}`}
            size="md"
            right={
              <IconButton
                icon="calendar-month"
                accessibilityLabel="Open calendar"
                onPress={() => {
                  setCalendarMonth(selected);
                  setCalendarOpen(true);
                }}
              />
            }
          />
          {habits.length ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              <WeekPager habits={habits} idx={idx} today={today} selected={selected} onSelect={setSelected} />
            </View>
          ) : null}
        </>
      }>
      <Sheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} title="Calendar">
        <MonthCalendar
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          today={today}
          cell={(d) => {
            const day = monthSeries.find((x) => x.date === d);
            if (!day) return {};
            const mark = dayMark(day, today);
            return {
              ring: { done: day.done, planned: day.planned, mark, filled: d === selected },
              fg: d === selected ? c.onPrimary : d === today ? c.primaryText : undefined,
              border: 'transparent',
              label: dayMarkLabel(day, mark),
            };
          }}
          onDayPress={(d) => {
            setSelected(d);
            setCalendarOpen(false);
          }}
        />
        <Text variant="bodySm" tone="tertiary" center>
          The ring fills with how much was done that day. Green with ✓: all of it.
        </Text>
      </Sheet>

      {habits.length === 0 ? (
        <EmptyStart />
      ) : (
        <>

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
            {completion.total > 0 ? (
              <Stack gap={spacing.sm}>
                <Row justify="space-between">
                  <Text variant="headlineSm" tabular>
                    {completion.done} of {completion.total} completed
                  </Text>
                  <Text variant="labelLg" tone="accent" tabular>
                    {Math.round((completion.ratio ?? 0) * 100)}%
                  </Text>
                </Row>
                <ProgressBar value={completion.ratio ?? 0} />
              </Stack>
            ) : (
              <Text variant="bodyMd" tone="secondary">
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


          {orderedPlan.length ? (
            <View style={{ gap: spacing.sm }}>
              {orderedPlan.map((o) => (
                <Animated.View key={o.habit.id} layout={LinearTransition.duration(250)}>
                  <HabitRow occ={o} date={selected} today={today} editable={editable} onOpen={(v) => open(o, v)} />
                </Animated.View>
              ))}
            </View>
          ) : null}

          {orderedFlex.length ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="This week" icon="date-range" right="Any day works" />
              {orderedFlex.map(({ habit, week, log }) => {
                const o = occurrence(habit, selected, idx, today);
                const note = `${week.done} of ${week.target}${week.extra ? ` · +${week.extra}` : ''}`;
                return (
                  <Animated.View key={habit.id} layout={LinearTransition.duration(250)}>
                    <HabitRow occ={{ ...o, log }} date={selected} today={today} editable={editable} note={note} onOpen={(v) => open({ ...o, log }, v)} />
                  </Animated.View>
                );
              })}
            </View>
          ) : null}

          {orderedSteps.length ? (
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Steps" icon="flag-circle" right={`${daySteps.filter((x) => x.step.doneAt).length} of ${daySteps.length}`} />
              {orderedSteps.map((x) => (
                <Animated.View key={x.step.id} layout={LinearTransition.duration(250)}>
                  <StepRow item={x} today={today} day={selected} onEdit={() => setEditStep(x.step)} />
                </Animated.View>
              ))}
            </View>
          ) : null}
          <StepSheet visible={!!editStep} onClose={() => setEditStep(null)} step={editStep} />

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
      {FEATURES.commitments ? <Button variant="secondary" title="Start a commitment" icon="flag" onPress={() => router.push('/commitment/new')} /> : null}
      <Button variant="secondary" title="Create a goal" icon="explore" onPress={() => router.push('/goal/new')} />
    </View>
  );
}

