import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Stepper } from '@/components/controls';
import { Text } from '@/components/text';
import { DURATION_PRESETS } from '@/copy';
import { addDays, formatShort, todayISO, weekdayIndex } from '@/domain/dates';
import { currentVersion } from '@/domain/schedule';
import type { Commitment, Habit, ISODate } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { daysPerWeek } from '../goals/shared';

export function durationLabel(days: number | null): string {
  return days === null ? 'Ongoing' : `${days} days`;
}

export function statusLabel(c: Commitment): string {
  return {
    draft: 'Draft',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  }[c.status];
}

export function nextMonday(from: ISODate = todayISO()): ISODate {
  return addDays(from, 7 - weekdayIndex(from));
}

/** Weekday indexes on which any habit is planned (flexible habits count as any day). */
export function rhythmDays(habits: Habit[]): number[] {
  const set = new Set<number>();
  for (const h of habits) {
    const s = currentVersion(h).schedule;
    if (s.type === 'daily' || s.type === 'flexWeekly') [0, 1, 2, 3, 4, 5, 6].forEach((d) => set.add(d));
    else if (s.type === 'weekdays') s.weekdays.forEach((d) => set.add(d));
    else s.dates.forEach((d) => set.add(weekdayIndex(d)));
  }
  return [...set].sort();
}

/** Planned minutes per week from duration habits. */
export function weeklyMinutes(habits: Habit[]): number {
  return habits.reduce((sum, h) => {
    const v = currentVersion(h);
    if (v.build?.trackingType !== 'duration') return sum;
    return sum + v.build.target * daysPerWeek(v.schedule);
  }, 0);
}

export function startDateLabel(d: ISODate): string {
  const t = todayISO();
  if (d === t) return `Today, ${formatShort(d)}`;
  if (d === addDays(t, 1)) return `Tomorrow, ${formatShort(d)}`;
  return formatShort(d);
}

/** 30 / 60 / 90 cards + custom + ongoing. */
export function DurationPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const c = useColors();
  const isPreset = DURATION_PRESETS.some((p) => p.days === value);
  const [custom, setCustom] = useState(value && !isPreset ? value : 21);
  return (
    <Stack>
      <Row gap={spacing.sm} align="stretch">
        {DURATION_PRESETS.map((p) => {
          const on = value === p.days;
          return (
            <Card
              key={p.days}
              selected={on}
              onPress={() => onChange(p.days)}
              accessibilityLabel={`${p.label}, ${p.hint}`}
              style={{ flex: 1 }}>
              <Text variant="headlineSm" color={on ? c.primaryText : undefined}>
                {p.label}
              </Text>
              <Text variant="bodySm" color={on ? c.primaryText : c.textSecondary}>
                {p.hint}
              </Text>
            </Card>
          );
        })}
      </Row>
      <Card selected={value !== null && !isPreset} onPress={() => onChange(custom)} accessibilityLabel="Custom duration">
        <Stack>
          <Row justify="space-between">
            <Text variant="labelLg">Custom duration</Text>
            <Text variant="bodySm" tone="tertiary">
              Any number of days
            </Text>
          </Row>
          {value !== null && !isPreset ? (
            <Stepper
              value={custom}
              min={7}
              max={365}
              step={7}
              unit="days"
              onChange={(v) => {
                setCustom(v);
                onChange(v);
              }}
            />
          ) : null}
        </Stack>
      </Card>
      <Card selected={value === null} onPress={() => onChange(null)} accessibilityLabel="Ongoing commitment, no fixed end date">
        <Row justify="space-between">
          <Text variant="labelLg">Ongoing commitment</Text>
          <Text variant="bodySm" tone="tertiary">
            No fixed end date
          </Text>
        </Row>
      </Card>
    </Stack>
  );
}

export function WeekdayDots({ days }: { days: number[] }) {
  const c = useColors();
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <Row justify="space-between">
      {letters.map((l, i) => {
        const on = days.includes(i);
        return (
          <View
            key={i}
            accessibilityLabel={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}: ${on ? 'practice' : 'rest'}`}
            style={{
              flex: 1,
              maxWidth: 44,
              aspectRatio: 1,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.primary : c.inset,
            }}>
            <Text variant="labelLg" color={on ? c.onPrimary : c.textTertiary}>
              {l}
            </Text>
          </View>
        );
      })}
    </Row>
  );
}

export function ConfirmButtons({ confirm, cancel }: { confirm: { title: string; onPress: () => void; danger?: boolean }; cancel: () => void }) {
  return (
    <Stack>
      <Button title={confirm.title} variant={confirm.danger ? 'danger' : 'primary'} onPress={confirm.onPress} />
      <Button title="Cancel" variant="ghost" onPress={cancel} />
    </Stack>
  );
}
