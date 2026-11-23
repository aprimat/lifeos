import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { IconButton } from './button';
import { Icon } from './icon';
import { Text } from './text';

export interface ScreenProps {
  children: ReactNode;
  /** Small centered title in the top bar. */
  title?: string;
  /** Show a back (or close) button. Defaults to router.back(). */
  back?: boolean | (() => void);
  close?: boolean | (() => void);
  /** Right side of the top bar. */
  right?: ReactNode;
  /** Show the profile avatar on the right (opens Settings). */
  avatar?: boolean;
  /** Sticky footer (e.g. Continue button). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Hide the top bar entirely (tab screens render their own). */
  bare?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function goBack(fallback = '/today') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

export function Screen({
  children,
  title,
  back,
  close,
  right,
  avatar,
  footer,
  scroll = true,
  bare,
  contentStyle,
  testID,
}: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const onBack = typeof back === 'function' ? back : () => goBack();
  const onClose = typeof close === 'function' ? close : () => goBack();

  const content = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {!bare && (
        <View style={[styles.bar, { borderBottomColor: c.border }]}>
          <View style={styles.barSide}>
            {back ? <IconButton icon="arrow-back-ios-new" accessibilityLabel="Back" onPress={onBack} /> : null}
            {close ? <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} /> : null}
          </View>
          <Text variant="headlineSm" numberOfLines={1} style={styles.barTitle} accessibilityRole="header">
            {title ?? ''}
          </Text>
          <View style={[styles.barSide, styles.barRight]}>
            {right}
            {avatar ? <Avatar /> : null}
          </View>
        </View>
      )}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ paddingBottom: footer ? spacing.lg : spacing.xxl + insets.bottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              { backgroundColor: c.background, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Profile avatar with initials; opens Settings. */
export function Avatar({ size = 36 }: { size?: number }) {
  const c = useColors();
  const name = useStore((s) => s.user?.name ?? '');
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      onPress={() => router.push('/settings')}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      {initials ? (
        <Text variant="labelLg" tone="onPrimary">
          {initials}
        </Text>
      ) : (
        <Icon name="person" color={c.onPrimary} size={20} />
      )}
    </Pressable>
  );
}

/** Header used on the three tab screens: "LifeOS / Today" + avatar. */
export function TabHeader({ section }: { section: string }) {
  const c = useColors();
  return (
    <View style={[styles.tabHeader]}>
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: c.primarySoft }]}>
          <Icon name="radio-button-checked" size={18} color={c.primaryText} />
        </View>
        <View>
          <Text variant="headlineSm">LifeOS</Text>
          <Text variant="labelMd" tone="tertiary">
            {section}
          </Text>
        </View>
      </View>
      <Avatar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md, width: '100%', maxWidth: 720, alignSelf: 'center' },
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barSide: { minWidth: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  barRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
