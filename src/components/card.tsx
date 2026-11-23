import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/hooks/use-theme';
import { radius, shadow, spacing } from '@/theme/tokens';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Inset (nested) surface — no border/shadow. */
  inset?: boolean;
  /** Selected state (primary tint). */
  selected?: boolean;
  padding?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ children, style, onPress, inset, selected, padding = spacing.md, accessibilityLabel, testID }: CardProps) {
  const c = useColors();
  const surface: ViewStyle = inset
    ? { backgroundColor: selected ? c.primarySoft : c.inset, borderRadius: radius.md }
    : {
        backgroundColor: selected ? c.primarySoft : c.card,
        borderColor: selected ? c.primary : c.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        ...shadow.card,
      };
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        // On web a pressable card may contain other buttons; avoid nested <button> elements.
        accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={selected !== undefined ? { selected } : undefined}
        onPress={onPress}
        style={({ pressed }) => [surface, { padding, opacity: pressed ? 0.85 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[surface, { padding }, style]}>
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = spacing.sm,
  style,
  align = 'center',
  justify,
  wrap,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export function Stack({ children, gap = spacing.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.xs }} />;
}

export function IconTile({
  children,
  tone = 'neutral',
  size = 44,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'sage' | 'amber' | 'solid';
  size?: number;
}) {
  const c = useColors();
  const bg = { neutral: c.inset, primary: c.primarySoft, sage: c.sageSoft, amber: c.amberSoft, solid: c.primary }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}
