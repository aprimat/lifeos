import { useEffect, useState, type ReactNode } from 'react';
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-theme';
import { radius, shadow, spacing } from '@/theme/tokens';

import { IconButton } from './button';
import { Text } from './text';

const OPEN_MS = 260;
const CLOSE_MS = 200;

/**
 * Bottom sheet built on Modal (works on iOS, Android and web).
 * The grey background appears at once; only the panel slides up. On close the panel
 * slides down first, then the background goes.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const offscreen = Dimensions.get('window').height;
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(offscreen);

  useEffect(() => {
    if (visible) {
      y.set(withTiming(0, { duration: reduced ? 0 : OPEN_MS }));
      return;
    }
    y.set(withTiming(offscreen, { duration: reduced ? 0 : CLOSE_MS }));
    const t = setTimeout(() => setMounted(false), reduced ? 0 : CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible, reduced, offscreen, y]);

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            style={[
              panel,
              styles.sheet,
              shadow.sheet,
              { backgroundColor: c.background, borderColor: c.border, paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}>
            <View style={[styles.grabber, { backgroundColor: c.idle }]} />
            <View style={styles.head}>
              <Text variant="headlineSm" style={{ flex: 1 }} accessibilityRole="header">
                {title ?? ''}
              </Text>
              <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} filled />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
});
