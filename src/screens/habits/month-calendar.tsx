import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { Text } from '@/components/text';
import { addDays, dayOfMonth, eachDay, endOfMonth, endOfWeek, formatLong, formatMonth, parseISODate, startOfMonth, startOfWeek, toISODate, weekdayLetter } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

export interface DayCellStyle {
  bg?: string;
  fg?: string;
  border?: string;
  dashed?: boolean;
  dot?: string;
  label?: string;
}

export function shiftMonth(month: ISODate, delta: number): ISODate {
  const d = parseISODate(startOfMonth(month));
  d.setMonth(d.getMonth() + delta);
  return toISODate(d);
}

/** Month grid (weeks start Monday) with per-day styling and optional tap handler. */
export function MonthCalendar({
  month,
  onMonthChange,
  cell,
  onDayPress,
  today,
}: {
  month: ISODate;
  onMonthChange: (m: ISODate) => void;
  cell: (date: ISODate) => DayCellStyle;
  onDayPress?: (date: ISODate) => void;
  today: ISODate;
}) {
  const c = useColors();
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const days = eachDay(startOfWeek(first), endOfWeek(last));
  const weeks: ISODate[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <IconButton icon="chevron-left" accessibilityLabel="Previous month" onPress={() => onMonthChange(shiftMonth(month, -1))} />
        <Text variant="headlineSm" accessibilityRole="header">
          {formatMonth(first)}
        </Text>
        <IconButton icon="chevron-right" accessibilityLabel="Next month" onPress={() => onMonthChange(shiftMonth(month, 1))} />
      </View>
      <View style={styles.row}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Text key={i} variant="labelSm" tone="tertiary" center style={styles.cellWrap}>
            {weekdayLetter(i)}
          </Text>
        ))}
      </View>
      {weeks.map((w) => (
        <View key={w[0]} style={styles.row}>
          {w.map((d) => {
            const inMonth = d >= first && d <= last;
            const s = inMonth ? cell(d) : {};
            const isToday = d === today;
            const content = (
              <View
                style={[
                  styles.cell,
                  {
                    backgroundColor: s.bg ?? 'transparent',
                    borderColor: s.border ?? (isToday ? c.primary : 'transparent'),
                    borderWidth: s.border || isToday ? 1.5 : 0,
                    borderStyle: s.dashed ? 'dashed' : 'solid',
                    opacity: inMonth ? 1 : 0.25,
                  },
                ]}>
                <Text variant="labelLg" tabular color={s.fg ?? (inMonth ? c.text : c.textTertiary)}>
                  {dayOfMonth(d)}
                </Text>
                {s.dot ? <View style={[styles.dot, { backgroundColor: s.dot }]} /> : null}
              </View>
            );
            return (
              <View key={d} style={styles.cellWrap}>
                {onDayPress && inMonth ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${formatLong(d)}${s.label ? `, ${s.label}` : ''}`}
                    onPress={() => onDayPress(d)}
                    hitSlop={2}>
                    {content}
                  </Pressable>
                ) : (
                  <View accessibilityLabel={inMonth && s.label ? `${d}, ${s.label}` : undefined}>{content}</View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function nextDays(start: ISODate, n: number): ISODate[] {
  return eachDay(start, addDays(start, n - 1));
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row' },
  cellWrap: { flex: 1, alignItems: 'center' },
  cell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 4 },
});
