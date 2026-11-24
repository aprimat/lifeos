import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import type { Breakdown } from '@/domain/analytics';
import { dayOfMonth, formatLong, weekdayIndex, weekdayLetter } from '@/domain/dates';
import type { DayStatus } from '@/domain/schedule';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { Icon } from './icon';
import { Text } from './text';

export function ProgressBar({ value, color, height = 6, track }: { value: number; color?: string; height?: number; track?: string }) {
  const c = useColors();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track ?? c.track, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

/** Stacked bar: full / minimum+partial / skipped / missed — never merges full with minimum. */
export function BreakdownBar({ b, height = 8 }: { b: Breakdown; height?: number }) {
  const c = useColors();
  const total = Math.max(1, b.eligible);
  const parts = [
    { n: b.full + b.within, color: c.primary },
    { n: b.minimum + b.partial, color: c.sage },
    { n: b.skipped + b.over, color: c.amber },
    { n: b.missed + b.notLogged, color: c.idle },
  ];
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: c.track, gap: 2 }}>
      {parts.map((p, i) => (p.n > 0 ? <View key={i} style={{ flex: p.n / total, backgroundColor: p.color }} /> : null))}
      {b.eligible === 0 ? null : <View style={{ flex: 0.0001 }} />}
    </View>
  );
}

export function BreakdownLegend({ b }: { b: Breakdown }) {
  const c = useColors();
  const items = [
    { label: 'Full', n: b.full + b.within, color: c.primary },
    { label: 'Minimum / partial', n: b.minimum + b.partial, color: c.sage },
    { label: b.over ? 'Skipped / over' : 'Skipped', n: b.skipped + b.over, color: c.amber },
    { label: 'Not logged', n: b.missed + b.notLogged, color: c.idle },
  ].filter((i) => i.n > 0);
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <Text variant="labelMd" tone="secondary" tabular>
            {i.label} {i.n}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ProgressRing({
  value,
  size = 72,
  stroke = 6,
  color,
  label,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={label}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * v} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <Text variant="labelLg" tabular>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Colour/icon for a day status (calendar & 7-day views). Colour is never the only signal. */
export function useStatusStyle() {
  const c = useColors();
  return (s: DayStatus | 'future') => {
    switch (s) {
      case 'full':
      case 'within':
        return { bg: c.primary, fg: c.onPrimary, icon: 'check', label: s === 'within' ? 'Within limit' : 'Completed' };
      case 'minimum':
      case 'partial':
        return { bg: c.sageSoft, fg: c.sage, icon: 'eco', label: s === 'minimum' ? 'Minimum version' : 'Partial' };
      case 'over':
        return { bg: c.amberSoft, fg: c.amber, icon: 'trending-up', label: 'Over limit' };
      case 'skipped':
        return { bg: c.inset, fg: c.textSecondary, icon: 'remove', label: 'Skipped' };
      case 'missed':
      case 'notLogged':
        return { bg: 'transparent', fg: c.textTertiary, icon: 'remove', label: 'Not logged' };
      case 'rest':
        return { bg: c.sageSoft, fg: c.sage, icon: 'bedtime', label: 'Planned rest' };
      case 'rescheduled':
        return { bg: c.inset, fg: c.textSecondary, icon: 'update', label: 'Rescheduled' };
      case 'upcoming':
        return { bg: 'transparent', fg: c.primaryText, icon: 'schedule', label: 'Today' };
      default:
        return { bg: 'transparent', fg: c.textTertiary, icon: null, label: 'Not scheduled' };
    }
  };
}

export function StatusDay({ status, size = 34, label }: { status: DayStatus | 'future'; size?: number; label?: string }) {
  const c = useColors();
  const st = useStatusStyle()(status);
  const outlined = status === 'missed' || status === 'notLogged' || status === 'upcoming';
  return (
    <View
      accessible
      accessibilityLabel={`${label ?? ''} ${st.label}`.trim()}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: st.bg,
        borderWidth: outlined ? 1.5 : 0,
        borderColor: status === 'upcoming' ? c.primary : c.idle,
        borderStyle: status === 'missed' || status === 'notLogged' ? 'dashed' : 'solid',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {st.icon ? <Icon name={st.icon} size={size * 0.5} color={st.fg} /> : <View style={[styles.dot, { backgroundColor: c.track }]} />}
    </View>
  );
}

/** Mon–Sun strip used on Today. */
export function WeekStrip({
  days,
  selected,
  today,
  onSelect,
}: {
  days: { date: string; done: number; planned: number }[];
  selected: string;
  today: string;
  onSelect: (d: string) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const active = d.date === selected;
        const future = d.date > today;
        const dot = d.planned === 0 ? 'transparent' : d.done >= d.planned ? c.sage : d.done > 0 ? c.primary : c.idle;
        return (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${formatLong(d.date)}${d.planned ? `, ${d.done} of ${d.planned} done` : ''}`}
            onPress={() => onSelect(d.date)}
            style={[styles.stripDay, active && { backgroundColor: c.primary }]}>
            <Text variant="labelMd" color={active ? c.onPrimary : c.textTertiary}>
              {weekdayLetter(weekdayIndex(d.date))}
            </Text>
            <Text variant="headlineSm" tabular color={active ? c.onPrimary : future ? c.textTertiary : c.text}>
              {dayOfMonth(d.date)}
            </Text>
            <View style={[styles.dot, { backgroundColor: active && d.planned ? c.onPrimary : dot }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Simple vertical bar chart with an optional reference line (limit / baseline). */
export function BarChart({
  data,
  height = 120,
  max,
  lines = [],
  color,
}: {
  data: { label: string; value: number | null; color?: string; highlight?: boolean }[];
  height?: number;
  max?: number;
  lines?: { value: number; color: string; dashed?: boolean }[];
  color?: string;
}) {
  const c = useColors();
  const top = Math.max(1, max ?? 0, ...data.map((d) => d.value ?? 0), ...lines.map((l) => l.value)) * 1.1;
  const w = 100 / data.length;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ height }}>
        <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          {data.map((d, i) =>
            d.value === null ? null : (
              <Rect
                key={i}
                x={i * w + w * 0.18}
                width={w * 0.64}
                y={height - (d.value / top) * height}
                height={Math.max(1, (d.value / top) * height)}
                rx={2}
                fill={d.color ?? color ?? c.primary}
                opacity={d.highlight === false ? 0.5 : 1}
              />
            ),
          )}
          {lines.map((l, i) => (
            <Line
              key={i}
              x1={0}
              x2={100}
              y1={height - (l.value / top) * height}
              y2={height - (l.value / top) * height}
              stroke={l.color}
              strokeWidth={1}
              strokeDasharray={l.dashed ? '2 2' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {data.map((d, i) => (
          <Text key={i} variant="labelSm" tone="tertiary" center style={{ flex: 1 }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'sage' | 'amber' | 'accent' }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="labelSm" tone="tertiary" uppercase>
        {label}
      </Text>
      <Text variant="headlineLg" tabular tone={tone ?? 'primary'}>
        {value}
      </Text>
      {sub ? (
        <Text variant="bodySm" tone="secondary">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  stripDay: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.md },
});
