import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Stepper } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Pill } from '@/components/layout';
import { StatusDay } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { clearLog, markRestDay, removeException, setLog } from '@/data/actions';
import { useStore } from '@/data/store';
import { habitBreakdown } from '@/domain/analytics';
import { addDays, eachDay, formatShort, weekdayIndex, weekdayShort } from '@/domain/dates';
import { logAmount, occurrence, statusForValue } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useIndex, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { successHaptic } from '@/services/haptics';
import { elapsedMs, formatClock, useTimer } from '@/services/timer';
import { radius, spacing } from '@/theme/tokens';

import { ArchivedBanner, HabitHeader, HabitMenu, STATUS_LABEL, statusTone } from './common';

export function BuildHabitDetails({ habit }: { habit: Habit }) {
  const c = useColors();
  const today = useToday();
  const idx = useIndex();
  const exceptions = useStore((s) => s.data.exceptions);
  const occ = occurrence(habit, today, idx, today);
  const v = occ.version;
  const build = v.build!;
  const unit = build.trackingType === 'duration' ? 'min' : build.unit;
  const [valueSheet, setValueSheet] = useState<null | { value: number; title: string }>(null);
  const [rescheduleSheet, setRescheduleSheet] = useState(false);
  const [askReflection, setAskReflection] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const log = occ.log;
  const restToday = exceptions.find((e) => e.habitId === habit.id && e.start === today && e.end === today);
  const archived = habit.status === 'archived';

  const done = (msg: string) => {
    successHaptic();
    setNote(msg);
  };

  const markFull = () => {
    setLog(habit.id, today, { status: 'full', value: build.trackingType === 'check' ? null : build.target });
    setAskReflection(false);
    done('Logged. Nicely done.');
  };
  const markMinimum = () => {
    setLog(habit.id, today, { status: 'minimum', value: build.minimum });
    setAskReflection(false);
    done('Minimum version logged. Showing up counts.');
  };
  const logValue = (value: number) => {
    const status = statusForValue(build, value);
    setLog(habit.id, today, { status, value });
    setValueSheet(null);
    setAskReflection(status === 'partial');
    done(status === 'full' ? 'Logged. Nicely done.' : 'Logged. Every bit of practice counts.');
  };
  const skip = () => {
    setLog(habit.id, today, { status: 'skipped' });
    setAskReflection(true);
    setNote('Skipped for today. Tomorrow is a fresh start.');
  };
  const rest = () => {
    markRestDay(habit.id, today);
    setAskReflection(false);
    setNote("Today is a planned rest day. It won't count against you.");
  };
  const undo = () => {
    clearLog(habit.id, today);
    if (restToday) removeException(restToday.id);
    setAskReflection(false);
    setNote(null);
  };
  const reschedule = (days: number) => {
    setLog(habit.id, today, { status: 'rescheduled', rescheduledTo: addDays(today, days) });
    setRescheduleSheet(false);
    setNote(`Moved to ${days === 1 ? 'tomorrow' : formatShort(addDays(today, days))}.`);
  };

  // 7-day view
  const week = eachDay(addDays(today, -6), today).map((d) => {
    const o = occurrence(habit, d, idx, today);
    const amount = o.log && o.log.status !== 'skipped' && o.log.status !== 'rescheduled' ? logAmount(o.version.build, o.log) : null;
    return { d, o, amount };
  });
  const weekB = habitBreakdown(habit, addDays(today, -6), today, idx, today);

  const recent = useMemo(
    () =>
      eachDay(addDays(today, -13), addDays(today, -1))
        .reverse()
        .map((d) => occurrence(habit, d, idx, today))
        .filter((o) => o.log || o.eligible || o.status === 'rest')
        .slice(0, 6),
    [habit, idx, today],
  );

  const logged = !!log || !!restToday;

  return (
    <Screen title="Habit details" back right={<HabitMenu habit={habit} />}>
      <HabitHeader habit={habit} occ={occ} />
      <ArchivedBanner habit={habit} />

      {v.anchor ? (
        <Card inset>
          <Row gap={spacing.md}>
            <Icon name="anchor" color={c.primaryText} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLg">Anchor: {v.anchor}</Text>
              <Text variant="bodySm" tone="secondary">
                Linked to a routine you already have.
              </Text>
            </View>
          </Row>
        </Card>
      ) : null}

      <Row gap={spacing.sm} align="stretch">
        <Card style={[styles.half, { borderTopColor: c.primary, borderTopWidth: 3 }]}>
          <Text variant="labelSm" tone="accent" uppercase>
            Target
          </Text>
          <Text variant="headlineLg" tabular>
            {build.trackingType === 'check' ? 'Done' : build.target}
            {build.trackingType !== 'check' ? <Text variant="bodyMd" tone="secondary">{` ${unit}`}</Text> : null}
          </Text>
          <Text variant="bodySm" tone="secondary">
            {scheduleText(habit)}
          </Text>
        </Card>
        <Card style={[styles.half, { borderTopColor: c.sage, borderTopWidth: 3 }]}>
          <Text variant="labelSm" tone="sage" uppercase>
            Minimum
          </Text>
          {build.minimum !== null ? (
            <>
              <Text variant="headlineLg" tabular>
                {build.minimum}
                <Text variant="bodyMd" tone="secondary">{` ${unit}`}</Text>
              </Text>
              <Text variant="bodySm" tone="secondary">
                {build.minimumLabel ?? 'Show up even on low-energy days.'}
              </Text>
            </>
          ) : (
            <Text variant="bodySm" tone="secondary">
              No minimum version set. You can add one in Edit.
            </Text>
          )}
        </Card>
      </Row>

      {/* Log today's practice */}
      {!archived ? (
        <Card>
          <Stack gap={spacing.md}>
            <Row justify="space-between">
              <Text variant="labelSm" tone="secondary" uppercase>
                Log today's practice
              </Text>
              {logged ? (
                <Pill label={restToday ? 'Planned rest' : STATUS_LABEL[occ.status]} tone={restToday ? 'sage' : statusTone(occ.status)} />
              ) : null}
            </Row>
            {!occ.planned && !logged && occ.status !== 'rest' ? (
              <Text variant="bodySm" tone="secondary">
                {v.schedule.type === 'flexWeekly'
                  ? 'Log a session whenever it fits this week.'
                  : "Not on today's plan — you can still log it as an extra session."}
              </Text>
            ) : null}

            {logged ? (
              <Stack gap={spacing.sm}>
                {log && log.value !== null && log.status !== 'skipped' && log.status !== 'rescheduled' ? (
                  <Text variant="bodyMd">
                    {log.value} {unit} logged
                  </Text>
                ) : null}
                {log?.status === 'rescheduled' && log.rescheduledTo ? (
                  <Text variant="bodyMd">Moved to {formatShort(log.rescheduledTo)}.</Text>
                ) : null}
                <Button title="Change today's log" variant="secondary" icon="undo" onPress={undo} />
              </Stack>
            ) : occ.status === 'rest' ? (
              <Text variant="bodyMd" tone="secondary">
                Today is a planned rest day. Enjoy it.
              </Text>
            ) : (
              <Stack gap={spacing.sm}>
                <Button
                  title={build.trackingType === 'check' ? 'Mark complete' : `Mark complete (${build.target} ${unit})`}
                  icon="check"
                  onPress={markFull}
                  testID="mark-complete"
                />
                <Row gap={spacing.sm} align="stretch">
                  {build.minimum !== null ? (
                    <OptionTile icon="eco" title="Low-energy" sub={`${build.minimum} ${unit} minimum`} onPress={markMinimum} tone="sage" />
                  ) : null}
                  {build.trackingType !== 'check' ? (
                    <OptionTile
                      icon="edit"
                      title="Enter amount"
                      sub="Partial or more"
                      onPress={() => setValueSheet({ value: Math.max(1, Math.round(build.target / 2)), title: 'How much did you do?' })}
                    />
                  ) : null}
                </Row>
                <Row gap={spacing.sm} align="stretch">
                  <OptionTile icon="bedtime" title="Planned rest" sub="No penalty" onPress={rest} />
                  <OptionTile icon="remove" title="Skip today" sub="That's okay" onPress={skip} />
                </Row>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRescheduleSheet(true)}
                  style={styles.linkRow}
                  hitSlop={6}>
                  <Icon name="update" size={18} color={c.primaryText} />
                  <Text variant="labelLg" tone="accent">
                    Reschedule to later
                  </Text>
                </Pressable>
              </Stack>
            )}
            {note ? (
              <Text variant="bodySm" tone="sage" accessibilityLiveRegion="polite">
                {note}
              </Text>
            ) : null}
            {askReflection ? (
              <Banner
                icon="psychology-alt"
                title="What got in the way?"
                body="A quick, optional note can help you plan for next time."
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/reflection?habitId=${habit.id}&date=${today}`)}
                    style={{ paddingVertical: spacing.xs }}>
                    <Text variant="labelLg" tone="accent">
                      Reflect for a moment
                    </Text>
                  </Pressable>
                }
              />
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {build.trackingType === 'duration' && !archived ? <TimerCard habit={habit} target={build.target} onLog={(m) => setValueSheet({ value: Math.max(1, m), title: 'Log your session' })} /> : null}

      {/* 7-day cadence */}
      <Card>
        <Stack gap={spacing.md}>
          <Row justify="space-between" align="flex-start">
            <View style={{ flex: 1 }}>
              <Text variant="headlineSm">Last 7 days</Text>
              <Text variant="bodySm" tone="secondary">
                {weekB.eligible === 0
                  ? 'Nothing planned yet in this period.'
                  : `${weekB.done} of ${weekB.eligible} planned sessions done`}
              </Text>
            </View>
          </Row>
          <View style={styles.week}>
            {week.map(({ d, o, amount }) => (
              <View key={d} style={styles.weekDay}>
                <Text variant="labelSm" tone={d === today ? 'accent' : 'tertiary'}>
                  {d === today ? 'Today' : weekdayShort(weekdayIndex(d))}
                </Text>
                <StatusDay status={o.status} label={formatShort(d)} />
                <Text variant="labelSm" tone="tertiary" tabular>
                  {amount !== null && build.trackingType !== 'check' ? `${amount}` : o.status === 'rest' ? 'Rest' : ' '}
                </Text>
              </View>
            ))}
          </View>
          {recent.length > 0 ? (
            <Stack gap={spacing.xs}>
              {recent.map((o) => (
                <Row key={o.date} justify="space-between" style={[styles.recent, { backgroundColor: c.inset }]}>
                  <Text variant="bodySm">{formatShort(o.date)}</Text>
                  <Row gap={spacing.sm}>
                    <Text variant="labelMd" tone="secondary">
                      {STATUS_LABEL[o.status]}
                    </Text>
                    {o.log && o.log.value !== null && o.status !== 'skipped' ? (
                      <Text variant="labelLg" tone="accent" tabular>
                        {o.log.value} {unit}
                      </Text>
                    ) : null}
                  </Row>
                </Row>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <Card inset>
        <Text variant="bodyMd" tone="secondary" style={{ fontStyle: 'italic' }}>
          “Sustainable habits bend with real life. Every return to the practice counts.”
        </Text>
      </Card>

      <Sheet visible={!!valueSheet} onClose={() => setValueSheet(null)} title={valueSheet?.title}>
        {valueSheet ? (
          <ValueEntry
            initial={valueSheet.value}
            unit={unit}
            max={build.trackingType === 'duration' ? 600 : 9999}
            onSave={logValue}
            hint={`Target ${build.target} ${unit}${build.minimum !== null ? ` · minimum ${build.minimum}` : ''}`}
          />
        ) : null}
      </Sheet>

      <Sheet visible={rescheduleSheet} onClose={() => setRescheduleSheet(false)} title="Reschedule">
        <Button
          title="Later today"
          variant="secondary"
          icon="schedule"
          onPress={() => {
            setRescheduleSheet(false);
            setNote("It stays on today's plan.");
          }}
        />
        <Button title="Tomorrow" variant="secondary" icon="event" onPress={() => reschedule(1)} />
        <Button title={`${formatShort(addDays(today, 2))}`} variant="secondary" icon="event" onPress={() => reschedule(2)} />
        <Text variant="bodySm" tone="tertiary">
          Rescheduled sessions move to the new day and aren't counted as missed.
        </Text>
      </Sheet>
    </Screen>
  );
}

function scheduleText(habit: Habit): string {
  const s = habit.versions[habit.versions.length - 1].schedule;
  switch (s.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return s.weekdays.length === 5 && s.weekdays.every((d) => d < 5) ? 'Weekdays' : s.weekdays.map((d) => weekdayShort(d)).join(', ');
    case 'flexWeekly':
      return `${s.timesPerWeek}× per week`;
    case 'dates':
      return `${s.dates.length} chosen dates`;
  }
}

function OptionTile({ icon, title, sub, onPress, tone }: { icon: string; title: string; sub: string; onPress: () => void; tone?: 'sage' }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.inset, opacity: pressed ? 0.8 : 1 }]}>
      <Icon name={icon} size={20} color={tone === 'sage' ? c.sage : c.textSecondary} />
      <Text variant="labelLg">{title}</Text>
      <Text variant="bodySm" tone="tertiary">
        {sub}
      </Text>
    </Pressable>
  );
}

function ValueEntry({ initial, unit, max, onSave, hint }: { initial: number; unit: string; max: number; onSave: (v: number) => void; hint: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Stack gap={spacing.md}>
      <Stepper value={value} onChange={setValue} min={1} max={max} unit={unit} large step={unit === 'min' && value >= 30 ? 5 : 1} />
      <Text variant="bodySm" tone="tertiary" center>
        {hint}
      </Text>
      <Button title="Save" icon="check" onPress={() => onSave(value)} />
    </Stack>
  );
}

function TimerCard({ habit, target, onLog }: { habit: Habit; target: number; onLog: (minutes: number) => void }) {
  const c = useColors();
  const timer = useTimer();
  const mine = timer.habitId === habit.id;
  const other = timer.habitId && !mine ? timer.habitTitle : null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!mine || !timer.startedAt) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [mine, timer.startedAt]);

  const elapsed = mine ? elapsedMs(timer) : 0;
  const remaining = target * 60_000 - elapsed;
  const today = useToday();

  return (
    <Card>
      <Stack gap={spacing.md}>
        <Row justify="space-between">
          <Text variant="labelSm" tone="secondary" uppercase>
            Timer
          </Text>
          <Text variant="labelMd" tone="tertiary">
            Optional
          </Text>
        </Row>
        {mine ? (
          <>
            <Row gap={spacing.sm}>
              <View style={[styles.dot, { backgroundColor: timer.startedAt ? c.primary : c.idle }]} />
              <Text variant="headlineLg" tabular accessibilityLiveRegion="polite">
                {remaining > 0 ? formatClock(remaining) : formatClock(elapsed)}
              </Text>
              <Text variant="bodySm" tone="secondary">
                {remaining > 0 ? 'remaining' : 'target reached'}
              </Text>
            </Row>
            <Row gap={spacing.sm}>
              {timer.startedAt ? (
                <Button title="Pause" icon="pause" variant="secondary" style={{ flex: 1 }} onPress={() => timer.pause()} />
              ) : (
                <Button title="Resume" icon="play-arrow" variant="secondary" style={{ flex: 1 }} onPress={() => timer.resume()} />
              )}
              <Button
                title="Finish"
                icon="stop"
                style={{ flex: 1 }}
                onPress={async () => {
                  const minutes = await timer.stop();
                  onLog(minutes);
                }}
              />
            </Row>
          </>
        ) : (
          <>
            {other ? (
              <Text variant="bodySm" tone="secondary">
                A timer is running for “{other}”. Starting here will replace it.
              </Text>
            ) : (
              <Text variant="bodySm" tone="secondary">
                Start a {target}-minute timer. You'll get a gentle notification when it's done.
              </Text>
            )}
            <Button
              title={`Start ${target}-minute timer`}
              icon="timer"
              variant="secondary"
              onPress={() => timer.start({ habitId: habit.id, habitTitle: habit.title, date: today, targetMinutes: target })}
            />
          </>
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1, gap: spacing.xs },
  tile: { flex: 1, minHeight: 72, padding: spacing.md, borderRadius: radius.md, gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4, flex: 1 },
  recent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
