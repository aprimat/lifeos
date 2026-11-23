import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/use-theme';
import { radius, shadow, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName | string;
  iconRight?: IconName | string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  children?: ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled,
  loading,
  size = 'md',
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.card, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.textSecondary, border: 'transparent' },
    dark: { bg: c.inverse, fg: c.onInverse, border: c.inverse },
    danger: { bg: c.card, fg: c.error, border: c.border },
  }[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'secondary' && shadow.card,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} color={palette.fg} /> : null}
          <Text variant={size === 'sm' ? 'labelMd' : 'labelLg'} color={palette.fg} style={styles.label}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 18 : 20} color={palette.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  filled,
  size = 40,
}: {
  icon: IconName | string;
  onPress?: () => void;
  accessibilityLabel: string;
  color?: string;
  filled?: boolean;
  size?: number;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? c.inset : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <Icon name={icon} size={22} color={color ?? c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 36, borderRadius: radius.md, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontFamily: 'Inter_600SemiBold' },
});
