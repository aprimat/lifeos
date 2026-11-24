import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

import { useColors } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
}

/** Material icons (the Stitch designs use Material Symbols). */
export function Icon({ name, size = 22, color }: IconProps) {
  const colors = useColors();
  const valid = name in MaterialIcons.glyphMap ? (name as IconName) : 'circle';
  return <MaterialIcons name={valid} size={size} color={color ?? colors.textSecondary} />;
}

/** Icons offered when choosing a habit icon. */
export const HABIT_ICONS: IconName[] = [
  'record-voice-over',
  'headphones',
  'menu-book',
  'self-improvement',
  'directions-walk',
  'directions-run',
  'fitness-center',
  'accessibility-new',
  'local-drink',
  'bedtime',
  'laptop',
  'edit-note',
  'translate',
  'spa',
  'restaurant',
  'phonelink-off',
  'smartphone',
  'smoke-free',
  'no-drinks',
  'favorite',
  'groups',
  'music-note',
  'brush',
  'savings',
];
