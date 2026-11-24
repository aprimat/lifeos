import { useColorScheme } from 'react-native';

import { useStore } from '@/data/store';
import { dark, light, type Palette } from '@/theme/tokens';

export function useColorMode(): 'light' | 'dark' {
  const system = useColorScheme();
  const pref = useStore((s) => s.data.settings.theme);
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Palette {
  return useColorMode() === 'dark' ? dark : light;
}

export function useReducedMotion(): boolean {
  return useStore((s) => s.data.settings.reducedMotion);
}
