import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockGate } from '@/components/lock-gate';
import { syncMilestones } from '@/data/actions';
import { flushSave, useStore } from '@/data/store';
import { useColorMode, useColors } from '@/hooks/use-theme';
import { syncNotifications } from '@/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const status = useStore((s) => s.status);
  const init = useStore((s) => s.init);
  const mode = useColorMode();
  const c = useColors();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, status]);

  // Persist pending writes when backgrounding.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flushSave();
    });
    return () => sub.remove();
  }, []);

  // Keep scheduled reminders in sync with the plan (debounced).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.status !== 'ready' || s.data === prev.data) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        syncMilestones();
        syncNotifications(useStore.getState().data);
      }, 1500);
    });
    return () => {
      unsub();
      if (t) clearTimeout(t);
    };
  }, []);
  useEffect(() => {
    if (status === 'ready') {
      syncMilestones();
      syncNotifications(useStore.getState().data);
    }
  }, [status]);

  useAuthRedirect(status);

  if (!fontsLoaded || status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: c.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <LockGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="goal" />
            <Stack.Screen name="commitment" />
            <Stack.Screen name="habit" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="weekly-review" />
            <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reflection" options={{ presentation: 'modal' }} />
          </Stack>
        </LockGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Signed-out users may only see (auth); signed-in users are sent away from it. */
function useAuthRedirect(status: string) {
  const segments = useSegments();
  const inAuth = segments[0] === '(auth)';
  useEffect(() => {
    if (status === 'signedOut' && !inAuth) router.replace('/welcome');
    else if (status === 'ready' && inAuth) router.replace('/');
  }, [status, inAuth]);
}
