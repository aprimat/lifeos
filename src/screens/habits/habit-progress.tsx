import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ScalePicker } from '@/components/controls';
import { Banner, Pill, SectionHeader } from '@/components/layout';
import { BarChart, BreakdownBar, BreakdownLegend, Metric, ProgressBar, useStatusStyle } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { OBSTACLES } from '@/copy';
import { rateAutomaticity } from '@/data/actions';
import { useStore } from '@/data/store';
import { consistency, habitBreakdown, pct, reduceTrend } from '@/domain/analytics';
import { addDays, diffDays, formatShort, startOfWeek } from '@/domain/dates';
import { getLog, logAmount, occurrence, versionOn } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useIndex, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { MonthCalendar } from './month-calendar';

export function HabitProgress({ habit }: { habit: Habit }) {
  const c = useColors();
  const today = useToday();
  const idx = useIndex();
  const statusStyle = useStatusStyle();
  const allRatings = useStore((s) => s.data.automaticity);
  const allReflections = useStore((s) => s.data.reflections);
  const [month, setMonth] = useState(today);
  const [rating, setRating] = useState<number | null>(null);

  const ratings = useMemo(
    () => allRatings.filter((a) => a.habitId === habit.id).sort((a, b) => a.date.localeCompare(b.date)),
    [allRatings, habit.id],
  );
  const reflections = useMemo(
    () => allReflections.filter((r) => r.habitId === habit.id).sort((a, b) => b.date.localeCompare(a.date)),
    [allReflections, habit.id],
  );

  const start = addDays(today, -29);
  const b = habitBreakdown(habit, start, today, idx, today);
  const cons = consistency(b);
  const v = versionOn(habit, today);
  const reduce = habit.kind === 'reduce';
  const unit = v.build?.trackingType === 'duration' ? 'min' : v.build?.unit ?? v.reduce?.unit ?? '';

  // Totals over 30 days
  let total = 0;
  const logs = idx.logsByHabit.get(habit.id);
  if (logs) {
    for (const [date, log] of logs) {
      if (date < start || date > today || log.status === 'skipped' || log.status === 'rescheduled') continue;
      total += reduce ? log.value ?? 0 : logAmount(versionOn(habit, date).build, log);
    }
  }

  // Last 4 weeks bars
  const weeks = [3, 2, 1, 0].map((k) => {
    const ws = addDays(startOfWeek(today), -7 * k);
    const we = addDays(ws, 6);
    let sum = 0;
    let days = 0;
    for (let d = ws; d <= we && d <= today; d = addDays(d, 1)) {
      const log = getLog(idx, habit.id, d);
      if (!log || log.status === 'skipped' || log.status === 'rescheduled') continue;
      days++;
      sum += reduce ? log.value ?? 0 : logAmount(versionOn(habit, d).build, log);
    }
    const wb = habitBreakdown(habit, ws, we, idx, today);
    const value =
      reduce ? (days ? Math.round(sum / days) : null) : v.build?.trackingType === 'check' ? wb.done : Math.round(sum);
    return { label: k === 0 ? 'This wk' : `W-${k}`, value, highlight: k === 0 };
  });

  const latest = ratings[ratings.length - 1];
  const canRate = !reduce && (!latest || diffDays(latest.date, today) >= 7);
  const first = ratings[0];

  // Urges (reduce)
  let urgeDays = 0;
  let urgeSum = 0;
  let intensitySum = 0;
  let intensityDays = 0;
  if (reduce && logs) {
    for (const [date, log] of logs) {
      if (date < start) continue;
      if (log.urges != null) {
        urgeDays++;
        urgeSum += log.urges;
      }
      if (log.urgeIntensity != null) {
        intensityDays++;
        intensitySum += log.urgeIntensity;
      }
    }
  }
  const trend = reduce ? reduceTrend(habit, today, 28, idx) : null;

  return (
    <Screen title="Habit progress" back avatar>
      <View style={{ gap: spacing.xs }}>
        <Text variant="labelSm" tone="accent" uppercase>
          {reduce ? 'Reduce' : 'Build'} · last 30 days
        </Text>
        <Text variant="headlineLg" accessibilityRole="header">
          {habit.title}
        </Text>
        <Text variant="bodyMd" tone="secondary">
          {reduce
            ? `${v.reduce?.mode === 'avoid' ? 'Avoid' : `Limit ${v.reduce?.limit} ${unit} per day`}`
            : `${v.build?.trackingType === 'check' ? 'Check off' : `${v.build?.target} ${unit}`}${v.anchor ? ` · ${v.anchor}` : ''}`}
        </Text>
      </View>

      <Card>
        <Stack gap={spacing.md}>
          <Row justify="space-between" align="flex-start">
            <Metric
              label={reduce ? 'Days within limit' : 'Consistency'}
              value={pct(cons)}
              sub={b.eligible ? `${b.done} of ${b.eligible} planned days` : 'Nothing planned yet'}
            />
            <Metric
              label={reduce ? 'Total logged' : v.build?.trackingType === 'check' ? 'Sessions' : 'Total'}
              value={reduce || v.build?.trackingType !== 'check' ? `${Math.round(total)}` : `${b.full + b.minimum + b.partial}`}
              sub={reduce || v.build?.trackingType !== 'check' ? unit : 'completed'}
            />
          </Row>
          <BreakdownBar b={b} />
          <BreakdownLegend b={b} />
          {b.rest > 0 || b.rescheduled > 0 ? (
            <Text variant="bodySm" tone="tertiary">
              {b.rest} planned rest {b.rest === 1 ? 'day' : 'days'} and {b.rescheduled} rescheduled — not counted as missed.
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Card>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          today={today}
          cell={(d) => {
            if (d > today) return { fg: c.textTertiary };
            const o = occurrence(habit, d, idx, today);
            const st = statusStyle(o.status);
            if (o.status === 'none') return {};
            if (o.status === 'missed' || o.status === 'notLogged')
              return { border: c.idle, dashed: true, fg: c.textSecondary, label: st.label };
            if (o.status === 'upcoming') return { border: c.primary, label: st.label };
            return { bg: st.bg, fg: st.fg, label: st.label };
          }}
        />
        <Row wrap gap={spacing.md} style={{ marginTop: spacing.md }}>
          <LegendDot color={c.primary} label={reduce ? 'Within limit' : 'Completed'} />
          <LegendDot color={c.sageSoft} border={c.sage} label={reduce ? 'Rest' : 'Minimum / partial / rest'} />
          {reduce ? <LegendDot color={c.amberSoft} border={c.amber} label="Over limit" /> : null}
          <LegendDot color={c.inset} label="Skipped" />
          <LegendDot color="transparent" border={c.idle} label="Not logged" />
        </Row>
        <Text variant="bodySm" tone="tertiary" style={{ marginTop: spacing.sm }}>
          Rest days are planned recovery, not lapses.
        </Text>
      </Card>

      <Card>
        <Stack gap={spacing.md}>
          <Text variant="headlineSm">
            {reduce ? `Average ${unit} per day` : v.build?.trackingType === 'check' ? 'Sessions per week' : `${unit === 'min' ? 'Minutes' : unit} per week`}
          </Text>
          <BarChart
            data={weeks.map((w) => ({ label: w.label, value: w.value, highlight: w.highlight, color: reduce ? c.sage : c.primary }))}
            lines={reduce && v.reduce ? [{ value: v.reduce.limit, color: c.primary, dashed: true }, ...(v.reduce.baseline !== null ? [{ value: v.reduce.baseline, color: c.slate }] : [])] : []}
          />
          {reduce && trend?.changeVsBaseline != null ? (
            <Text variant="bodySm" tone="secondary">
              4-week average {Math.round(trend.average ?? 0)} {unit} per day —{' '}
              {trend.changeVsBaseline <= 0
                ? `${Math.round(-trend.changeVsBaseline * 100)}% below baseline.`
                : `${Math.round(trend.changeVsBaseline * 100)}% above baseline.`}
            </Text>
          ) : null}
        </Stack>
      </Card>

      {reduce ? (
        <Card>
          <Stack gap={spacing.sm}>
            <Text variant="headlineSm">Urges</Text>
            <Text variant="bodySm" tone="tertiary">
              Tracked separately from the behaviour itself. Self-reported.
            </Text>
            {urgeDays === 0 ? (
              <Text variant="bodyMd" tone="secondary">
                No urges logged yet. You can track them from the habit's daily log.
              </Text>
            ) : (
              <Row justify="space-between">
                <Metric label="Per logged day" value={(urgeSum / urgeDays).toFixed(1)} sub={`${urgeDays} days`} />
                <Metric label="Avg intensity" value={intensityDays ? `${(intensitySum / intensityDays).toFixed(1)}/5` : '—'} />
              </Row>
            )}
          </Stack>
        </Card>
      ) : (
        <Card>
          <Stack gap={spacing.md}>
            <Row justify="space-between">
              <Text variant="headlineSm">How natural does it feel?</Text>
              <Pill label="Self-reported" />
            </Row>
            <Text variant="bodySm" tone="secondary">
              Your own sense of how automatic this habit feels — separate from how often you do it.
            </Text>
            {latest ? (
              <Stack gap={spacing.xs}>
                <Row gap={spacing.sm} align="flex-end">
                  <Text variant="display" tabular>
                    {latest.score}
                  </Text>
                  <Text variant="bodyMd" tone="secondary">
                    / 10 · {formatShort(latest.date)}
                  </Text>
                </Row>
                <ProgressBar value={latest.score / 10} />
                {first && first !== latest ? (
                  <Text variant="bodySm" tone="sage">
                    {latest.score > first.score
                      ? `Up from ${first.score}/10 on ${formatShort(first.date)}`
                      : `First rating ${first.score}/10 on ${formatShort(first.date)}`}
                  </Text>
                ) : null}
              </Stack>
            ) : null}
            {canRate ? (
              <Stack gap={spacing.sm}>
                <Text variant="labelLg">How natural does this habit feel right now?</Text>
                <ScalePicker value={rating} onChange={setRating} min={1} max={10} />
                <Row justify="space-between">
                  <Text variant="labelSm" tone="tertiary">
                    1 · takes effort
                  </Text>
                  <Text variant="labelSm" tone="tertiary">
                    10 · second nature
                  </Text>
                </Row>
                <Button
                  title="Save rating"
                  variant="secondary"
                  disabled={rating === null}
                  onPress={() => {
                    if (rating !== null) rateAutomaticity(habit.id, rating, today);
                    setRating(null);
                  }}
                />
              </Stack>
            ) : (
              <Text variant="bodySm" tone="tertiary">
                You can rate again {latest ? `after ${formatShort(addDays(latest.date, 7))}` : 'soon'}.
              </Text>
            )}
            {ratings.length > 1 ? (
              <Stack gap={spacing.xs}>
                {[...ratings].reverse().slice(0, 6).map((r) => (
                  <Row key={r.id} justify="space-between">
                    <Text variant="bodySm" tone="secondary">
                      {formatShort(r.date)}
                    </Text>
                    <Text variant="labelLg" tabular>
                      {r.score}/10
                    </Text>
                  </Row>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Card>
      )}

      <SectionHeader
        title="Reflections"
        right={
          <Button
            title="Add"
            icon="add"
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/reflection?habitId=${habit.id}&date=${today}`)}
          />
        }
      />
      {reflections.length === 0 ? (
        <Banner icon="edit-note" body="Reflections you add after a difficult day will appear here." />
      ) : (
        reflections.slice(0, 12).map((r) => (
          <Card key={r.id}>
            <Stack gap={spacing.xs}>
              <Text variant="labelMd" tone="tertiary">
                {formatShort(r.date)}
              </Text>
              {r.obstacles.length ? (
                <Row wrap gap={spacing.xs}>
                  {r.obstacles.map((o) => (
                    <Pill key={o} label={OBSTACLES.find((x) => x.value === o)?.label ?? o} />
                  ))}
                  {r.triggers.map((t) => (
                    <Pill key={t} label={t} tone="amber" />
                  ))}
                </Row>
              ) : r.triggers.length ? (
                <Row wrap gap={spacing.xs}>
                  {r.triggers.map((t) => (
                    <Pill key={t} label={t} tone="amber" />
                  ))}
                </Row>
              ) : null}
              {r.helpNextTime ? <Text variant="bodyMd">Next time: {r.helpNextTime}</Text> : null}
              {r.note ? (
                <Text variant="bodyMd" tone="secondary">
                  “{r.note}”
                </Text>
              ) : null}
            </Stack>
          </Card>
        ))
      )}

      <Button title="Back to habit" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
    </Screen>
  );
}

function LegendDot({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: border ? 1.5 : 0, borderColor: border }} />
      <Text variant="labelMd" tone="secondary">
        {label}
      </Text>
    </Row>
  );
}
