import { router } from 'expo-router';
import { Pressable, StyleSheet, View, Platform } from 'react-native';

import { IconTile } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { TIME_OF_DAY } from '@/copy';
import { consistency, habitBreakdown } from '@/domain/analytics';
import { addDays, maxDate, weekdayShort } from '@/domain/dates';
import { currentVersion, type DataIndex } from '@/domain/schedule';
import type { FocusArea, Habit, HabitVersion, Schedule } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

export const FOCUS_ICON: Record<FocusArea, string> = {
  learning: 'menu-book',
  health: 'favorite-border',
  focus: 'center-focus-strong',
  wellbeing: 'self-improvement',
  relationships: 'groups',
  growth: 'spa',
};

export function focusIcon(f: FocusArea | null | undefined): string {
  return f ? FOCUS_ICON[f] : 'flag';
}

export function scheduleLabel(s: Schedule): string {
  switch (s.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const d = [...s.weekdays].sort();
      if (d.join() === '0,1,2,3,4') return 'Weekdays';
      if (d.join() === '5,6') return 'Weekends';
      if (d.length === 7) return 'Every day';
      return d.map(weekdayShort).join(', ');
    }
    case 'flexWeekly':
      return `${s.timesPerWeek}× per week`;
    case 'dates':
      return `${s.dates.length} set date${s.dates.length === 1 ? '' : 's'}`;
  }
}

export function targetLabel(h: Habit, v: HabitVersion): string {
  if (h.kind === 'reduce' && v.reduce) {
    const r = v.reduce;
    if (r.mode === 'avoid') return 'Avoid';
    return `Limit ${r.limit} ${r.unit}/day`;
  }
  if (v.build) {
    if (v.build.trackingType === 'check') return 'Done / not done';
    return `${v.build.target} ${v.build.unit}`;
  }
  return '';
}

export function habitSubtitle(h: Habit): string {
  const v = currentVersion(h);
  const time = TIME_OF_DAY.find((t) => t.value === v.timeOfDay)?.label;
  return [targetLabel(h, v), scheduleLabel(v.schedule), v.timeOfDay !== 'anytime' ? time : null].filter(Boolean).join(' · ');
}

/** Days per week a schedule plans (flexible = times per week; dates ≈ averaged). */
export function daysPerWeek(s: Schedule): number {
  switch (s.type) {
    case 'daily':
      return 7;
    case 'weekdays':
      return s.weekdays.length;
    case 'flexWeekly':
      return s.timesPerWeek;
    case 'dates':
      return 0;
  }
}

/** Consistency over the last `days` days (null = no eligible opportunities). */
export function recentConsistency(h: Habit, idx: DataIndex, today: string, days = 28): number | null {
  const start = maxDate(addDays(today, -(days - 1)), h.startDate);
  return consistency(habitBreakdown(h, start, today, idx, today));
}

export function HabitRow({
  habit,
  right,
  onPress,
  subtitle,
}: {
  habit: Habit;
  right?: React.ReactNode;
  onPress?: () => void;
  subtitle?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      // Web: rows may contain their own buttons; avoid nested <button> elements.
      accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'}
      accessibilityLabel={habit.title}
      onPress={onPress ?? (() => router.push(`/habit/${habit.id}`))}
      style={({ pressed }) => [styles.row, { backgroundColor: c.inset, opacity: pressed ? 0.8 : 1 }]}>
      <IconTile size={36} tone={habit.kind === 'reduce' ? 'amber' : 'primary'}>
        <Icon name={habit.icon} size={18} color={habit.kind === 'reduce' ? c.amber : c.primaryText} />
      </IconTile>
      <View style={{ flex: 1 }}>
        <Text variant="labelLg" numberOfLines={1}>
          {habit.title}
        </Text>
        <Text variant="bodySm" tone="tertiary" numberOfLines={1}>
          {subtitle ?? habitSubtitle(habit)}
        </Text>
      </View>
      {typeof right === 'string' ? (
        <Text variant="labelLg" tabular tone="secondary">
          {right}
        </Text>
      ) : (
        right
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
});
