import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';

import { flushSave } from '@/data/store';

/**
 * Over-the-air updates in installed builds (TestFlight / store / internal).
 *
 * On launch and whenever the app returns to the foreground, check EAS for a newer
 * compatible update and download it in the background. When it's ready, offer to
 * restart now; "Later" applies it on the next cold start anyway.
 * Disabled in development, Expo Go and on web.
 */
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function updatesSupported(): boolean {
  return (
    !__DEV__ &&
    Platform.OS !== 'web' &&
    Updates.isEnabled &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

export function useOverTheAirUpdates() {
  const lastCheck = useRef(0);
  const prompted = useRef(false);

  useEffect(() => {
    if (!updatesSupported()) return;

    async function check() {
      if (prompted.current || Date.now() - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (!fetched.isNew || prompted.current) return;
        prompted.current = true;
        Alert.alert('Update ready', 'A new version of LifeOS has been downloaded. Restart now to use it?', [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart',
            onPress: async () => {
              await flushSave().catch(() => {});
              await Updates.reloadAsync().catch(() => {});
            },
          },
        ]);
      } catch {
        // Offline or server unavailable: try again next time the app is opened.
      }
    }

    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);
}
