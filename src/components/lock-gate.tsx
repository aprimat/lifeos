import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal, Platform, StyleSheet, View } from 'react-native';

import { useStore } from '@/data/store';
import { useColors } from '@/hooks/use-theme';
import { authenticate } from '@/services/biometrics';
import { radius, spacing } from '@/theme/tokens';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

const RELOCK_AFTER_MS = 5 * 60 * 1000;

/**
 * Biometric app lock: on cold start and after 5+ minutes in the background.
 * Also hides content while the app is inactive (app switcher privacy).
 */
export function LockGate({ children }: { children: ReactNode }) {
  const c = useColors();
  const ready = useStore((s) => s.status === 'ready');
  const lockSetting = useStore((s) => s.data.settings.biometricLock);
  const enabled = ready && lockSetting && Platform.OS !== 'web';
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  // Lock once when the data first loads (cold start or sign-in) with the lock on. Turning the
  // lock on in Settings has just asked for Face ID, so it doesn't lock (and ask) again.
  const [sawReady, setSawReady] = useState(false);
  if (ready && !sawReady) {
    setSawReady(true);
    if (enabled) setLocked(true);
  }
  if (!ready && sawReady) setSawReady(false);
  if (!enabled && locked) setLocked(false);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') {
        if (!prompting.current) {
          setCovered(true);
          backgroundedAt.current = backgroundedAt.current ?? Date.now();
        }
      } else if (s === 'active') {
        setCovered(false);
        if (backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = async () => {
    if (prompting.current) return;
    prompting.current = true;
    const ok = await authenticate('Unlock LifeOS');
    prompting.current = false;
    backgroundedAt.current = null;
    if (ok) setLocked(false);
  };

  useEffect(() => {
    // State only changes after the Face ID prompt resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (locked && enabled) unlock();
  }, [locked, enabled]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* A Modal, not a View: it must cover open sheets and modal screens too. */}
      <Modal visible={enabled && (locked || covered)} animationType="none" onRequestClose={() => {}} statusBarTranslucent>
        <View style={[styles.cover, { backgroundColor: c.background }]}>
          <View style={[styles.logo, { backgroundColor: c.primarySoft }]}>
            <Icon name="lock-outline" size={30} color={c.primaryText} />
          </View>
          <Text variant="headlineMd" center>
            LifeOS is locked
          </Text>
          <Text variant="bodyMd" tone="secondary" center>
            Your reflections stay private.
          </Text>
          {locked ? <Button title="Unlock" icon="fingerprint" onPress={unlock} style={{ alignSelf: 'stretch' }} /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
