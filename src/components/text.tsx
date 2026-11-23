import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useColors } from '@/hooks/use-theme';
import { typography, type Palette, type TypographyVariant } from '@/theme/tokens';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'sage'
  | 'amber'
  | 'error'
  | 'onPrimary'
  | 'onInverse';

const toneKey: Record<TextTone, keyof Palette> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'primaryText',
  sage: 'sage',
  amber: 'amber',
  error: 'error',
  onPrimary: 'onPrimary',
  onInverse: 'onInverse',
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Tabular numerals for metrics. */
  tabular?: boolean;
  center?: boolean;
  uppercase?: boolean;
  strike?: boolean;
  color?: string;
}

export function Text({
  variant = 'bodyMd',
  tone = 'primary',
  tabular,
  center,
  uppercase,
  strike,
  color,
  style,
  ...rest
}: TextProps) {
  const colors = useColors();
  const s: TextStyle = {
    ...typography[variant],
    color: color ?? colors[toneKey[tone]],
    ...(tabular ? { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] } : null),
    ...(center ? { textAlign: 'center' as const } : null),
    ...(uppercase ? { textTransform: 'uppercase' as const } : null),
    ...(strike ? { textDecorationLine: 'line-through' as const } : null),
  };
  return <RNText maxFontSizeMultiplier={1.6} {...rest} style={[s, style]} />;
}
