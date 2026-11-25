import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Icon } from '@/components/icon';
import { SectionHeader } from '@/components/layout';
import { BreakdownBar, BreakdownLegend } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { pct } from '@/domain/analytics';
import { addDays, endOfMonth, formatMonth, formatRange, minutesLabel, startOfMonth } from '@/domain/dates';
import { missSummary, type MissSummary } from '@/domain/misses';
import { periodReport, type PeriodReport } from '@/domain/report';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { shiftMonth } from '../habits/month-calendar';
import { MissCard } from './miss-card';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Plain-language wins, best first. Never empty: a quiet period still gets a kind line. */
export function reportWins(r: PeriodReport, previousLabel = 'last month'): string[] {
  const b = r.breakdown;
  const wins: string[] = [];
  if (r.best) wins.push(`${r.best.habit.title} went best: ${r.best.breakdown.done} of ${r.best.breakdown.eligible} (${pct(r.best.consistency)}).`);
  if (r.consistency !== null && r.previousConsistency !== null && r.consistency > r.previousConsistency) {
    wins.push(`Up from ${pct(r.previousConsistency)} ${previousLabel}.`);
  }
  if (b.done > 0) wins.push(`${plural(b.done, 'session')} done${r.minutes ? `, ${minutesLabel(r.minutes)} in all` : ''}.`);
  if (b.minimum + b.partial > 0) wins.push(`${plural(b.minimum + b.partial, 'smaller version')} on busy days. Showing up still counts.`);
  if (b.within > 0) wins.push(`${plural(b.within, 'day')} within your limit.`);
  if (b.rest > 0) wins.push(`${plural(b.rest, 'rest day')} taken as planned.`);
  if (!wins.length) wins.push('Nothing logged yet in this period. Every report starts with one session.');
  return wins.slice(0, 4);
}

/** The report body, shared by the monthly report and a commitment's look back. */
export function ReportBody({ report, previousLabel, misses }: { report: PeriodReport; previousLabel?: string; misses?: MissSummary }) {
  const c = useColors();
  const b = report.breakdown;
  const adjust = report.adjust;
  return (
    <>
      <Card>
        <Stack gap={spacing.sm}>
          <Row>
            <Icon name="wb-sunny" size={20} color={c.sage} />
            <Text variant="labelLg">What went well</Text>
          </Row>
          {reportWins(report, previousLabel).map((w) => (
            <Row key={w} align="flex-start" gap={spacing.sm}>
              <Icon name="check" size={18} color={c.sage} />
              <Text variant="bodyMd" style={{ flex: 1 }}>
                {w}
              </Text>
            </Row>
          ))}
        </Stack>
      </Card>

      <Card>
        <Stack gap={spacing.sm}>
          <Text variant="labelSm" tone="tertiary" uppercase>
            Success rate
          </Text>
          <Text variant="display" tabular>
            {pct(report.consistency)}
          </Text>
          <Text variant="bodySm" tone="secondary">
            {b.eligible ? `${b.done} of ${b.eligible} planned sessions done` : 'Nothing planned in this period yet'}
          </Text>
          {b.eligible ? (
            <>
              <BreakdownBar b={b} />
              <BreakdownLegend b={b} />
            </>
          ) : null}
        </Stack>
      </Card>

      {report.habits.length ? (
        <>
          <SectionHeader title="Each habit" />
          <Card padding={0}>
            {report.habits.map((r, i) => (
              <Pressable
                key={r.habit.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.habit.title}: ${pct(r.consistency)}. Open its progress`}
                onPress={() => router.push(`/habit/${r.habit.id}/progress`)}
                style={{ padding: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelLg" numberOfLines={1}>
                    {r.habit.title}
                  </Text>
                  <Text variant="bodySm" tone="secondary">
                    {r.breakdown.eligible ? `${r.breakdown.done} of ${r.breakdown.eligible} planned` : `${r.breakdown.done} done, nothing planned`}
                    {r.breakdown.minimum + r.breakdown.partial ? ` · ${r.breakdown.minimum + r.breakdown.partial} smaller` : ''}
                  </Text>
                </View>
                <Text variant="labelLg" tone="accent" tabular>
                  {pct(r.consistency)}
                </Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {misses ? <MissCard summary={misses} /> : null}

      {adjust ? (
        <Card inset>
          <Stack gap={spacing.sm}>
            <Row>
              <Icon name="tune" size={20} color={c.primaryText} />
              <Text variant="labelLg">One thing to adjust</Text>
            </Row>
            <Text variant="bodyMd">
              {adjust.habit.title}: {adjust.breakdown.done} of {adjust.breakdown.eligible}. A smaller target, a minimum version for busy days, or a different time
              of day often helps.
            </Text>
            <Button title="Adjust this habit" size="sm" variant="secondary" icon="edit" onPress={() => router.push(`/habit/${adjust.habit.id}/edit`)} style={{ alignSelf: 'flex-start' }} />
          </Stack>
        </Card>
      ) : null}
    </>
  );
}

/** Monthly report. Param: month (any date in it, YYYY-MM-DD); default this month. */
export function MonthlyReportScreen() {
  const params = useLocalSearchParams<{ month?: string }>();
  const today = useToday();
  const habits = useLiveHabits();
  const idx = useIndex();
  const month = startOfMonth(params.month && /^\d{4}-\d{2}-\d{2}$/.test(params.month) ? params.month : today);
  const start = month;
  const end = endOfMonth(month);
  const prevStart = shiftMonth(month, -1);
  const report = useMemo(
    () => periodReport(habits, start, end, idx, today, { compareTo: { start: prevStart, end: addDays(start, -1) } }),
    [habits, start, end, prevStart, idx, today],
  );
  const reflections = useData().reflections;
  const misses = useMemo(() => missSummary(habits, reflections, start, end, idx, today), [habits, reflections, start, end, idx, today]);
  const current = start <= today && today <= end;

  return (
    <Screen title="Monthly report" back>
      <Row justify="space-between">
        <IconButton icon="chevron-left" accessibilityLabel="Previous month" onPress={() => router.setParams({ month: prevStart })} />
        <View style={{ alignItems: 'center' }}>
          <Text variant="headlineMd" accessibilityRole="header">
            {formatMonth(month)}
          </Text>
          <Text variant="bodySm" tone="tertiary">
            {current ? `So far · ${formatRange(start, today)}` : formatRange(start, end)}
          </Text>
        </View>
        {current ? (
          <View style={{ width: 40 }} />
        ) : (
          <IconButton icon="chevron-right" accessibilityLabel="Next month" onPress={() => router.setParams({ month: shiftMonth(month, 1) })} />
        )}
      </Row>
      {start > today ? (
        <Text variant="bodyMd" tone="secondary" center>
          This month hasn&apos;t started yet.
        </Text>
      ) : (
        <ReportBody report={report} misses={misses} previousLabel="last month" />
      )}
    </Screen>
  );
}
