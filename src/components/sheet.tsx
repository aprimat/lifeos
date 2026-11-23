import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-theme';
import { radius, shadow, spacing } from '@/theme/tokens';

import { IconButton } from './button';
import { Text } from './text';

/** Bottom sheet built on Modal (works on iOS, Android and web). */
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.anchor} pointerEvents="box-none">
          <View
            style={[
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
          </View>
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
