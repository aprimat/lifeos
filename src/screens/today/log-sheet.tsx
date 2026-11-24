import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Row } from '@/components/card';
import { Stepper } from '@/components/controls';
import { Banner } from '@/components/layout';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { clearLog, markRestDay, setLog } from '@/data/actions';
import { addDays, formatShort } from '@/domain/dates';
import { statusForValue } from '@/domain/schedule';
import type { ActivityLog, Habit, HabitVersion, ISODate } from '@/domain/types';
import { useTimer } from '@/services/timer';
import { spacing } from '@/theme/tokens';

import { minimumLabel, targetLabel } from './labels';

export interface LogTarget {
  habit: Habit;
  version: HabitVersion;
  date: ISODate;
  log?: ActivityLog;
  /** Prefill (e.g. minutes from a stopped timer). */
  initialValue?: number;
}

/**
 * Logging options for one habit on one date: full, minimum, partial, skip,
 * reschedule, rest day, timer, clear. Reduce habits log an amount.
 */
export function LogSheet({
  target,
  today,
  onClose,
}: {
  target: LogTarget | null;
  today: ISODate;
  onClose: (result?: 'skipped' | 'partial' | 'over') => void;
}) {
  const habit = target?.habit;
  const v = target?.version;
  const build = v?.build ?? null;
  const reduce = v?.reduce ?? null;
  const [value, setValue] = useState(0);
  const timerHabit = useTimer((s) => s.habitId);
  const startTimer = useTimer((s) => s.start);

  useEffect(() => {
    if (!target) return;
    if (target.initialValue !== undefined) setValue(target.initialValue);
    else if (target.log?.value !== null && target.log?.value !== undefined) setValue(target.log.value);
    else if (reduce) setValue(reduce.limit);
    else if (build) setValue(Math.max(1, Math.round(build.target / 2)));
  }, [target, build, reduce]);

  if (!target || !habit || !v) return <Sheet visible={false} onClose={() => onClose()}>{null}</Sheet>;

  const { date, log } = target;
  const flexible = v.schedule.type === 'flexWeekly';
  const step = (unit: string) => (unit === 'min' ? 5 : 1);

  const close = (result?: 'skipped' | 'partial' | 'over') => onClose(result);

  return (
    <Sheet visible onClose={() => close()} title={habit.title}>
      <Text variant="bodySm" tone="secondary">
        {date === today ? 'Today' : formatShort(date)} · {targetLabel(v)}
      </Text>

      {build ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            title={`Done · ${targetLabel(v)}`}
            icon="check"
            onPress={() => {
              setLog(habit.id, date, { status: 'full', value: build.trackingType === 'check' ? null : Math.max(build.target, target.initialValue ?? 0) });
              close();
            }}
          />
          {build.minimum !== null ? (
            <Button
              variant="secondary"
              icon="eco"
              title={`Minimum version · ${minimumLabel(v)}`}
              onPress={() => {
                setLog(habit.id, date, { status: 'minimum', value: build.minimum });
                close();
              }}
            />
          ) : null}

          {build.trackingType !== 'check' ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Text variant="labelLg">Log an amount</Text>
              <Stepper value={value} onChange={setValue} min={0} max={9999} step={step(build.unit)} unit={build.unit} />
              <Button
                variant="secondary"
                title="Save amount"
                disabled={value <= 0}
                onPress={() => {
                  const status = statusForValue(build, value);
                  setLog(habit.id, date, { status, value });
                  close(status === 'partial' ? 'partial' : undefined);
                }}
              />
            </View>
          ) : null}

          {build.trackingType === 'duration' && date === today && timerHabit !== habit.id ? (
            <Button
              variant="ghost"
              icon="timer"
              title="Start timer"
              onPress={async () => {
                await startTimer({ habitId: habit.id, habitTitle: habit.title, date, targetMinutes: build.target });
                close();
              }}
            />
          ) : null}
        </View>
      ) : null}

      {reduce ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="labelLg">How much today?</Text>
          <Stepper value={value} onChange={setValue} min={0} max={9999} step={step(reduce.unit)} unit={reduce.unit} large />
          <Text variant="bodySm" tone="secondary" center>
            {reduce.mode === 'avoid'
              ? 'Aim: none today'
              : `Today's limit: ${reduce.limit} ${reduce.unit}${reduce.baseline ? ` · baseline ${reduce.baseline}` : ''}`}
          </Text>
          {value > reduce.limit ? (
            <Banner
              icon="visibility"
              body="Noticing and logging is what matters. This is useful information, not a failure."
            />
          ) : null}
          <Button
            title="Save"
            icon="check"
            onPress={() => {
              setLog(habit.id, date, { status: 'logged', value });
              close(value > reduce.limit ? 'over' : undefined);
            }}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <Text variant="labelSm" tone="tertiary" uppercase>
          Other options
        </Text>
        <Row wrap gap={spacing.sm}>
          {build ? (
            <Button
              size="sm"
              variant="secondary"
              title="Skip"
              icon="remove"
              onPress={() => {
                setLog(habit.id, date, { status: 'skipped' });
                close('skipped');
              }}
            />
          ) : null}
          {!flexible && date >= today ? (
            <Button
              size="sm"
              variant="secondary"
              title="Move to tomorrow"
              icon="update"
              onPress={() => {
                setLog(habit.id, date, { status: 'rescheduled', rescheduledTo: addDays(date, 1) });
                close();
              }}
            />
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            title="Rest day"
            icon="bedtime"
            onPress={() => {
              markRestDay(habit.id, date);
              close();
            }}
          />
          {log ? (
            <Button
              size="sm"
              variant="ghost"
              title="Clear"
              icon="undo"
              onPress={() => {
                clearLog(habit.id, date);
                close();
              }}
            />
          ) : null}
        </Row>
        <Text variant="bodySm" tone="tertiary">
          Planned rest never counts as a missed day.
        </Text>
      </View>
    </Sheet>
  );
}
