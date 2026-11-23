import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useColors, useReducedMotion } from '@/hooks/use-theme';
import { selectionHaptic, tapHaptic } from '@/services/haptics';
import { fonts, radius, shadow, spacing, typography } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

// ---------- Chips ----------

export function Chip({
  label,
  selected,
  onPress,
  icon,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName | string;
  small?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        {
          backgroundColor: selected ? c.inverse : c.card,
          borderColor: selected ? c.inverse : c.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {icon ? <Icon name={icon} size={16} color={selected ? c.onInverse : c.textSecondary} /> : null}
      <Text variant={small ? 'labelMd' : 'labelLg'} color={selected ? c.onInverse : c.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple,
  small,
}: {
  options: { value: T; label: string; icon?: IconName | string }[];
  value: T | T[] | null;
  onChange: (v: T | T[]) => void;
  multiple?: boolean;
  small?: boolean;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip
          key={o.value}
          small={small}
          label={o.label}
          icon={o.icon}
          selected={selected(o.value)}
          onPress={() => {
            if (multiple) {
              const arr = Array.isArray(value) ? value : [];
              onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
            } else onChange(o.value);
          }}
        />
      ))}
    </View>
  );
}

// ---------- Segmented control ----------

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName | string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segment, { backgroundColor: c.inset }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              selectionHaptic();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && [{ backgroundColor: c.card }, shadow.card]]}>
            {o.icon ? <Icon name={o.icon} size={16} color={active ? c.primaryText : c.textSecondary} /> : null}
            <Text variant="labelLg" color={active ? c.primaryText : c.textSecondary} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Selectable card ----------

export function SelectableCard({
  title,
  description,
  icon,
  selected,
  onPress,
  eyebrow,
  children,
  multiple,
  testID,
}: {
  title: string;
  description?: string;
  icon?: IconName | string;
  selected: boolean;
  onPress: () => void;
  eyebrow?: string;
  children?: ReactNode;
  multiple?: boolean;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected } : { selected }}
      accessibilityLabel={title}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.selectable,
        shadow.card,
        {
          backgroundColor: selected ? c.primarySoft : c.card,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      {icon ? (
        <View style={[styles.selIcon, { backgroundColor: selected ? c.primary : c.inset }]}>
          <Icon name={icon} size={22} color={selected ? c.onPrimary : c.textSecondary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? (
          <Text variant="labelSm" tone="accent" uppercase>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="headlineSm">{title}</Text>
        {description ? (
          <Text variant="bodySm" tone="secondary">
            {description}
          </Text>
        ) : null}
        {children}
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? c.primary : c.idle, backgroundColor: selected ? c.primary : 'transparent' },
        ]}>
        {selected ? <Icon name="check" size={14} color={c.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

// ---------- Check circle (habit node) ----------

export type CheckState = 'idle' | 'done' | 'minimum' | 'partial' | 'skipped' | 'rest' | 'over';

export function CheckCircle({
  state,
  onPress,
  onLongPress,
  label,
  size = 28,
}: {
  state: CheckState;
  onPress?: () => void;
  onLongPress?: () => void;
  label: string;
  size?: number;
}) {
  const c = useColors();
  const reduced = useReducedMotion();
  const filled = state !== 'idle';
  const color = {
    idle: c.idle,
    done: c.primary,
    minimum: c.sage,
    partial: c.sage,
    skipped: c.slate,
    rest: c.slate,
    over: c.amber,
  }[state];
  const icon = { idle: null, done: 'check', minimum: 'check', partial: 'check', skipped: 'remove', rest: 'bedtime', over: 'priority-high' }[state];
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : withSpring(filled ? 1 : 0.92, { damping: 14, stiffness: 220 }) }],
  }));
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === 'done' || state === 'minimum' || state === 'partial' }}
      accessibilityLabel={label}
      accessibilityHint="Double tap to mark complete. Long press for more options."
      hitSlop={10}
      onPress={() => {
        tapHaptic();
        onPress?.();
      }}
      onLongPress={onLongPress}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            backgroundColor: filled ? color : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          },
          anim,
        ]}>
        {icon ? <Icon name={icon} size={size * 0.6} color={c.onPrimary} /> : null}
      </Animated.View>
    </Pressable>
  );
}

// ---------- Rows ----------

export function ListRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
  danger,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName | string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, { opacity: pressed ? 0.7 : 1 }]}>
      {icon ? <Icon name={icon} size={22} color={danger ? c.error : c.textSecondary} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMd" color={danger ? c.error : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySm" tone="tertiary">
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron-right" size={20} color={c.textTertiary} /> : null}
    </Pressable>
  );
}

export function ToggleRow({
  title,
  subtitle,
  icon,
  value,
  onChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName | string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.listRow, disabled && { opacity: 0.5 }]}>
      {icon ? <Icon name={icon} size={22} color={c.textSecondary} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMd">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: c.track, true: c.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

// ---------- Inputs ----------

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  showCount,
  style,
  error,
  ...rest
}: TextInputProps & { showCount?: boolean; error?: string | null }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          multiline && styles.inputMulti,
          {
            color: c.text,
            backgroundColor: c.card,
            borderColor: error ? c.error : focused ? c.primary : c.border,
          },
          focused && { boxShadow: `0 0 0 3px ${c.primary}1F` },
          style,
        ]}
      />
      {error ? (
        <Text variant="bodySm" tone="error">
          {error}
        </Text>
      ) : null}
      {showCount && maxLength ? (
        <Text variant="labelMd" tone="tertiary" style={{ alignSelf: 'flex-end' }}>
          {(value ?? '').length} / {maxLength}
        </Text>
      ) : null}
    </View>
  );
}

/** − value + stepper with tabular numbers. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  large,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  large?: boolean;
}) {
  const c = useColors();
  const btn = (icon: string, delta: number, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        selectionHaptic();
        onChange(Math.min(max, Math.max(min, value + delta)));
      }}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={22} color={c.text} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { backgroundColor: c.inset }]} accessibilityLabel={`${value} ${unit ?? ''}`}>
      {btn('remove', -step, 'Decrease')}
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text variant={large ? 'display' : 'headlineMd'} tabular>
          {value}
          {unit ? <Text variant="bodyMd" tone="secondary">{` ${unit}`}</Text> : null}
        </Text>
      </View>
      {btn('add', step, 'Increase')}
    </View>
  );
}

/** 1–N scale picker (energy, stress, automaticity). */
export function ScalePicker({
  value,
  onChange,
  max = 5,
  labels,
  min = 1,
}: {
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
  min?: number;
  labels?: string[];
}) {
  const c = useColors();
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={[styles.scale, { backgroundColor: c.inset }]}>
      {items.map((n, i) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels?.[i] ? `${n}, ${labels[i]}` : String(n)}
            onPress={() => {
              selectionHaptic();
              onChange(n);
            }}
            style={[styles.scaleItem, active && [{ backgroundColor: c.card }, shadow.card]]}>
            <Text variant="labelLg" tabular color={active ? c.primaryText : c.text}>
              {n}
            </Text>
            {labels?.[i] ? (
              <Text variant="labelSm" color={active ? c.primaryText : c.textTertiary} center numberOfLines={2}>
                {labels[i]}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Mon–Sun circular toggles. */
export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const c = useColors();
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return (
    <View style={styles.weekdays}>
      {letters.map((l, i) => {
        const on = value.includes(i);
        return (
          <Pressable
            key={i}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={names[i]}
            onPress={() => {
              selectionHaptic();
              onChange(on ? value.filter((x) => x !== i) : [...value, i].sort());
            }}
            style={[styles.weekday, { backgroundColor: on ? c.primary : c.inset }]}>
            <Text variant="labelLg" color={on ? c.onPrimary : c.textSecondary}>
              {l}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Simple time picker: hour and 15-minute steps (works on every platform). */
export function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const set = (hh: number, mm: number) => onChange(`${String((hh + 24) % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const c = useColors();
  return (
    <View style={[styles.stepper, { backgroundColor: c.inset }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Earlier" onPress={() => (m >= 15 ? set(h, m - 15) : set(h - 1, 45))} style={[styles.stepBtn, { backgroundColor: c.card, borderColor: c.border }]}>
        <Icon name="remove" size={22} color={c.text} />
      </Pressable>
      <Text variant="headlineMd" tabular style={{ flex: 1, textAlign: 'center' }}>
        {h12}:{String(m).padStart(2, '0')} {h >= 12 ? 'PM' : 'AM'}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Later" onPress={() => (m < 45 ? set(h, m + 15) : set(h + 1, 0))} style={[styles.stepBtn, { backgroundColor: c.card, borderColor: c.border }]}>
        <Icon name="add" size={22} color={c.text} />
      </Pressable>
    </View>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.group, shadow.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  chipSmall: { minHeight: 32, paddingHorizontal: 10 },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
  },
  selectable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  selIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: typography.bodyLg.fontSize,
  },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scale: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  scaleItem: { flex: 1, minHeight: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekday: { flex: 1, aspectRatio: 1, maxWidth: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
});
