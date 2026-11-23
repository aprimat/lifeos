import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

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
  const enabled = useStore((s) => s.status === 'ready' && s.data.settings.biometricLock) && Platform.OS !== 'web';
  const [locked, setLocked] = useState(enabled);
  const [covered, setCovered] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  // Lock on first load when enabled (cold start).
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && enabled) {
      initialized.current = true;
      setLocked(true);
    }
    if (!enabled) setLocked(false);
  }, [enabled]);

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
    prompting.current = true;
    const ok = await authenticate('Unlock LifeOS');
    prompting.current = false;
    backgroundedAt.current = null;
    if (ok) setLocked(false);
  };

  useEffect(() => {
    if (locked && enabled) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, enabled]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {enabled && (locked || covered) ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: c.background }]}>
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
