import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Row, Stack } from '@/components/card';
import { SegmentedControl } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { BarChart, BreakdownBar, BreakdownLegend, ProgressBar, ProgressRing, StatusDay } from '@/components/progress';
import { Screen, TabHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { OBSTACLES } from '@/copy';
import {
  commitmentProgress,
  consistency,
  dailySeries,
  habitBreakdown,
  habitsBreakdown,
  minutesInRange,
  pct,
  reduceTrend,
} from '@/domain/analytics';
import {
  addDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  formatMonth,
  formatRange,
  formatShort,
  minDate,
  minutesLabel,
  startOfMonth,
  startOfWeek,
  weekdayIndex,
  weekdayLetter,
} from '@/domain/dates';
import { missSummary } from '@/domain/misses';
import { occurrence } from '@/domain/schedule';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { MissCard } from './miss-card';
import { RhythmChart, type RhythmColumn } from './rhythm-chart';

type Range = 'week' | 'weeks4' | 'month';

export function ProgressScreen() {
  const c = useColors();
  const today = useToday();
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const [range, setRange] = useState<Range>('week');

  const { start, end } = useMemo(() => {
    if (range === 'week') return { start: startOfWeek(today), end: endOfWeek(today) };
    if (range === 'weeks4') return { start: addDays(startOfWeek(today), -21), end: endOfWeek(today) };
    return { start: startOfMonth(today), end: endOfMonth(today) };
  }, [range, today]);

  const breakdown = useMemo(() => habitsBreakdown(habits, start, end, idx, today), [habits, start, end, idx, today]);
  const misses = useMemo(() => missSummary(habits, data.reflections, start, end, idx, today), [habits, data.reflections, start, end, idx, today]);
  const minutes = useMemo(() => minutesInRange(habits, start, minDate(end, today), idx), [habits, start, end, idx, today]);

  const columns = useMemo<RhythmColumn[]>(() => {
    const series = dailySeries(habits, start, end, idx, today);
    if (range === 'week') {
      return series.map((d) => ({
        label: weekdayLetter(weekdayIndex(d.date)),
        planned: d.planned,
        done: d.done,
        rest: d.rest,
        future: d.future,
      }));
    }
    const cols: RhythmColumn[] = [];
    for (let ws = startOfWeek(start); ws <= end; ws = addDays(ws, 7)) {
      const days = series.filter((d) => d.date >= ws && d.date <= addDays(ws, 6));
      if (!days.length) continue;
      cols.push({
        label: formatShort(ws),
        planned: days.reduce((a, d) => a + d.planned, 0),
        done: days.reduce((a, d) => a + d.done, 0),
        future: days.every((d) => d.future),
      });
    }
    return cols;
  }, [habits, start, end, idx, today, range]);

  const last7 = useMemo(() => eachDay(addDays(today, -6), today), [today]);
  const visibleHabits = useMemo(() => habits.filter((h) => h.status !== 'archived' && h.startDate <= today), [habits, today]);

  const commitments = useMemo(
    () =>
      data.commitments
        .filter((k) => k.status === 'active' || k.status === 'paused')
        .map((k) => ({ commitment: k, progress: commitmentProgress(k, habits, idx, today) })),
    [data.commitments, habits, idx, today],
  );

  const buildTrends = useMemo(
    () =>
      visibleHabits
        .filter((h) => h.kind === 'build')
        .map((h) => {
          const ratings = data.automaticity.filter((a) => a.habitId === h.id).sort((a, b) => a.date.localeCompare(b.date));
          return { habit: h, b: habitBreakdown(h, start, end, idx, today), latest: ratings[ratings.length - 1], first: ratings[0] };
        })
        .filter((r) => r.b.eligible > 0 || r.b.done > 0),
    [visibleHabits, data.automaticity, start, end, idx, today],
  );

  const reduceTrends = useMemo(
    () => visibleHabits.filter((h) => h.kind === 'reduce').map((h) => ({ habit: h, t: reduceTrend(h, today, 7, idx) })),
    [visibleHabits, today, idx],
  );

  const reflections = useMemo(() => [...data.reflections].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3), [data.reflections]);
  const reviews = useMemo(
    () => data.weeklyReviews.filter((r) => r.completedAt).sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 3),
    [data.weeklyReviews],
  );

  const lastWeek = addDays(startOfWeek(today), -7);
  const lastMonth = startOfMonth(addDays(startOfMonth(today), -1));
  const lastWeekReviewed = data.weeklyReviews.some((r) => r.weekStart === lastWeek && r.completedAt);
  const hadPlanLastWeek = habits.some((h) => h.startDate <= addDays(lastWeek, 6));
  const habitTitle = (id: string) => data.habits.find((h) => h.id === id)?.title ?? 'Habit';

  if (habits.length === 0) {
    return (
      <Screen bare>
        <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
          <TabHeader section="Progress" />
        </View>
        <EmptyState
          icon="insights"
          title="Progress will appear here"
          body="Once you log a few days, you'll see your rhythm, trends and reflections — measured honestly, without streaks."
          actionLabel="Add a habit"
          onAction={() => router.push('/habit/new')}
        />
      </Screen>
    );
  }

  const cons = consistency(breakdown);

  return (
    <Screen bare testID="progress-screen">
      <View style={{ marginHorizontal: -spacing.md, marginTop: -spacing.sm }}>
        <TabHeader section="Progress" />
      </View>

      <SegmentedControl
        options={[
          { value: 'week', label: 'This week' },
          { value: 'weeks4', label: 'Last 4 weeks' },
          { value: 'month', label: 'This month' },
        ]}
        value={range}
        onChange={setRange}
      />
      <Row gap={6}>
        <Icon name="spa" size={16} color={c.sage} />
        <Text variant="bodySm" tone="secondary">
          {formatRange(start, end)} · measured gently, without streaks.
        </Text>
      </Row>

      {hadPlanLastWeek ? (
        <Card onPress={() => router.push(`/weekly-review?week=${lastWeek}`)} accessibilityLabel="Open weekly review">
          <Row gap={spacing.md}>
            <Icon name="event-note" size={22} color={c.primaryText} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLg">{lastWeekReviewed ? 'Last week reviewed' : 'Your weekly review is ready'}</Text>
              <Text variant="bodySm" tone="secondary">
                Week of {formatShort(lastWeek)} · {lastWeekReviewed ? 'tap to revisit' : 'about 3 minutes'}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={c.textTertiary} />
          </Row>
        </Card>
      ) : null}

      <Card onPress={() => router.push(`/report?month=${lastMonth}`)} accessibilityLabel={`Open the report for ${formatMonth(lastMonth)}`}>
        <Row gap={spacing.md}>
          <Icon name="calendar-month" size={22} color={c.primaryText} />
          <View style={{ flex: 1 }}>
            <Text variant="labelLg">Your {formatMonth(lastMonth).split(' ')[0]} report</Text>
            <Text variant="bodySm" tone="secondary">
              What went well, each habit&apos;s success rate, one thing to adjust
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={c.textTertiary} />
        </Row>
        <Pressable accessibilityRole="button" onPress={() => router.push('/report')} style={{ paddingTop: spacing.sm }}>
          <Text variant="labelMd" tone="accent">
            This month so far
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Row justify="space-between" align="flex-start">
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="labelSm" tone="tertiary" uppercase>
              Consistency
            </Text>
            <Text variant="display" tabular>
              {pct(cons)}
            </Text>
            <Text variant="bodySm" tone="secondary">
              {breakdown.eligible
                ? `Based on ${breakdown.eligible} planned ${breakdown.eligible === 1 ? 'session' : 'sessions'}`
                : 'Nothing to measure yet in this range'}
            </Text>
          </View>
          <ProgressRing value={cons} size={76} label={cons === null ? '—' : undefined} />
        </Row>
        {breakdown.eligible ? (
          <Stack gap={spacing.sm} style={{ marginTop: spacing.md }}>
            <BreakdownBar b={breakdown} />
            <BreakdownLegend b={breakdown} />
          </Stack>
        ) : null}
      </Card>

      <Row gap={spacing.sm} align="stretch">
        <Card style={{ flex: 1 }}>
          <Text variant="labelSm" tone="tertiary" uppercase>
            Planned vs done
          </Text>
          <Text variant="headlineLg" tabular>
            {breakdown.done}
            <Text variant="bodyMd" tone="secondary">{` / ${breakdown.eligible}`}</Text>
          </Text>
          <Stack gap={2}>
            <Text variant="bodySm" tone="secondary">
              {breakdown.rest} rest {breakdown.rest === 1 ? 'day' : 'days'} honoured
            </Text>
            <Text variant="bodySm" tone="secondary">
              {breakdown.rescheduled} rescheduled
            </Text>
          </Stack>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="labelSm" tone="tertiary" uppercase>
            Time invested
          </Text>
          <Text variant="headlineLg" tabular>
            {minutes ? minutesLabel(minutes) : '—'}
          </Text>
          <Text variant="bodySm" tone="secondary">
            Timed practice in this range
          </Text>
        </Card>
      </Row>
      <Banner icon="bedtime" body="Rest is recorded as rest, not absence." />

      <MissCard summary={misses} />

      <SectionHeader title={range === 'week' ? 'Daily rhythm' : 'Weekly rhythm'} icon="bar-chart" />
      <Card>
        <RhythmChart columns={columns} />
      </Card>

      {visibleHabits.length ? (
        <>
          <SectionHeader title="Last 7 days" icon="grid-view" />
          <Card>
            <Row>
              <View style={{ flex: 1 }} />
              {last7.map((d) => (
                <Text key={d} variant="labelSm" tone="tertiary" center style={{ width: 32 }}>
                  {weekdayLetter(weekdayIndex(d))}
                </Text>
              ))}
            </Row>
            <Stack gap={spacing.sm} style={{ marginTop: spacing.sm }}>
              {visibleHabits.map((h) => (
                <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={`${h.title} progress`} onPress={() => router.push(`/habit/${h.id}/progress`)}>
                  <Row>
                    <Text variant="bodySm" numberOfLines={1} style={{ flex: 1, paddingRight: spacing.sm }}>
                      {h.title}
                    </Text>
                    {last7.map((d) => (
                      <View key={d} style={{ width: 32, alignItems: 'center' }}>
                        <StatusDay status={occurrence(h, d, idx, today).status} size={24} label={`${h.title} ${formatShort(d)}`} />
                      </View>
                    ))}
                  </Row>
                </Pressable>
              ))}
            </Stack>
          </Card>
        </>
      ) : null}

      {commitments.length ? (
        <>
          <SectionHeader title="Commitments" icon="flag" />
          {commitments.map(({ commitment, progress }) => (
            <Card key={commitment.id} onPress={() => router.push(`/commitment/${commitment.id}`)} accessibilityLabel={`Open ${commitment.title}`}>
              <Row justify="space-between" align="flex-start">
                <View style={{ flex: 1 }}>
                  <Text variant="labelSm" tone="accent" uppercase>
                    {commitment.status === 'paused' ? 'Paused' : progress.totalDays ? `Day ${progress.day} of ${progress.totalDays}` : `Ongoing · day ${progress.day}`}
                  </Text>
                  <Text variant="headlineSm">{commitment.title}</Text>
                </View>
                <Pill label={pct(progress.consistency)} tone="primary" />
              </Row>
              <View style={{ marginVertical: spacing.sm }}>
                <ProgressBar value={progress.timeRatio ?? progress.consistency ?? 0} />
              </View>
              <Row justify="space-between">
                <Text variant="bodySm" tone="secondary">
                  {progress.breakdown.done} of {progress.breakdown.eligible} sessions logged
                </Text>
                {progress.daysRemaining !== null ? (
                  <Text variant="bodySm" tone="tertiary">
                    {progress.daysRemaining} days left
                  </Text>
                ) : null}
              </Row>
            </Card>
          ))}
        </>
      ) : null}

      {buildTrends.length ? (
        <>
          <SectionHeader title="Building habits" icon="trending-up" />
          <Card padding={0}>
            {buildTrends.map(({ habit, b, latest, first }, i) => (
              <Pressable
                key={habit.id}
                accessibilityRole="button"
                onPress={() => router.push(`/habit/${habit.id}/progress`)}
                style={{ padding: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, gap: 6 }}>
                <Row justify="space-between">
                  <Text variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>
                    {habit.title}
                  </Text>
                  <Text variant="labelLg" tabular tone="accent">
                    {pct(consistency(b))}
                  </Text>
                </Row>
                <Text variant="bodySm" tone="secondary">
                  {b.done} of {b.eligible} planned sessions
                  {b.minimum + b.partial ? ` · ${b.minimum + b.partial} minimum/partial` : ''}
                  {b.extra ? ` · +${b.extra} extra` : ''}
                </Text>
                {latest ? (
                  <Text variant="bodySm" tone="tertiary">
                    Feels {latest.score}/10 natural (self-reported)
                    {first && first.id !== latest.id ? ` · started at ${first.score}/10` : ''}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {reduceTrends.length ? (
        <>
          <SectionHeader title="Reducing" icon="trending-down" />
          {reduceTrends.map(({ habit, t }) => (
            <Card key={habit.id} onPress={() => router.push(`/habit/${habit.id}`)} accessibilityLabel={`Open ${habit.title}`}>
              <Row justify="space-between" align="flex-start">
                <View style={{ flex: 1 }}>
                  <Text variant="labelLg">{habit.title}</Text>
                  <Text variant="bodySm" tone="secondary">
                    Daily limit {t.limit} · {t.loggedDays} of 7 days logged
                  </Text>
                </View>
                {t.changeVsBaseline !== null ? (
                  <Pill label={`${t.changeVsBaseline <= 0 ? '−' : '+'}${Math.abs(Math.round(t.changeVsBaseline * 100))}% vs baseline`} tone={t.changeVsBaseline <= 0 ? 'sage' : 'neutral'} />
                ) : null}
              </Row>
              {t.loggedDays ? (
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <Row gap={spacing.lg}>
                    <View>
                      <Text variant="labelSm" tone="tertiary" uppercase>
                        7-day average
                      </Text>
                      <Text variant="headlineMd" tabular>
                        {Math.round(t.average ?? 0)}
                      </Text>
                    </View>
                    {t.baseline !== null ? (
                      <View>
                        <Text variant="labelSm" tone="tertiary" uppercase>
                          Baseline
                        </Text>
                        <Text variant="headlineMd" tabular tone="secondary">
                          {t.baseline}
                        </Text>
                      </View>
                    ) : null}
                  </Row>
                  <BarChart
                    height={90}
                    data={t.series.map((s) => ({
                      label: weekdayLetter(weekdayIndex(s.date)),
                      value: s.value,
                      color: s.within === false ? c.amber : c.sage,
                    }))}
                    lines={[
                      { value: t.limit, color: c.primary, dashed: true },
                      ...(t.baseline !== null ? [{ value: t.baseline, color: c.slate }] : []),
                    ]}
                  />
                  <Text variant="bodySm" tone="tertiary">
                    Dashed line: today's limit{t.baseline !== null ? ' · solid line: baseline' : ''}
                  </Text>
                </View>
              ) : (
                <Text variant="bodySm" tone="tertiary" style={{ marginTop: spacing.sm }}>
                  No entries in the last 7 days yet.
                </Text>
              )}
            </Card>
          ))}
        </>
      ) : null}


      {reflections.length || reviews.length ? (
        <>
          <SectionHeader title="Reflections" icon="edit-note" />
          {reviews.map((r) => (
            <Card key={r.id} onPress={() => router.push(`/weekly-review?week=${r.weekStart}`)} accessibilityLabel={`Weekly review ${formatShort(r.weekStart)}`}>
              <Text variant="labelSm" tone="tertiary" uppercase>
                Weekly review · {formatRange(r.weekStart, addDays(r.weekStart, 6))}
              </Text>
              <Text variant="bodyMd" numberOfLines={3} style={{ marginTop: 4 }}>
                {r.note ?? r.gaveEnergy ?? r.feltHeavy ?? 'Reviewed.'}
              </Text>
            </Card>
          ))}
          {reflections.map((r) => (
            <Card key={r.id} inset>
              <Row justify="space-between">
                <Text variant="labelLg" numberOfLines={1} style={{ flex: 1 }}>
                  {habitTitle(r.habitId)}
                </Text>
                <Text variant="labelMd" tone="tertiary">
                  {formatShort(r.date)}
                </Text>
              </Row>
              {r.obstacles.length ? (
                <Text variant="bodySm" tone="secondary">
                  {r.obstacles.map((o) => OBSTACLES.find((x) => x.value === o)?.label ?? o).join(' · ')}
                </Text>
              ) : null}
              {r.helpNextTime || r.note ? (
                <Text variant="bodySm" tone="secondary" style={{ marginTop: 2 }}>
                  “{r.helpNextTime ?? r.note}”
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

    </Screen>
  );
}
