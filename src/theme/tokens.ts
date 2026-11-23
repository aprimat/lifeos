/**
 * Design tokens from stitch_lifeos_habit_tracker_ios/lifeos_quiet_systematic/DESIGN.md
 * ("LifeOS Quiet Systematic"), plus a derived dark palette.
 */

export interface Palette {
  background: string;
  card: string;
  inset: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Fills: primary buttons, selected states. */
  primary: string;
  /** Primary-coloured text and icons (links, accents). */
  primaryText: string;
  primarySoft: string;
  onPrimary: string;
  sage: string;
  sageSoft: string;
  amber: string;
  amberSoft: string;
  slate: string;
  error: string;
  errorSoft: string;
  inverse: string;
  onInverse: string;
  track: string;
  idle: string;
  overlay: string;
}

export const light: Palette = {
  background: '#F9F9FE',
  card: '#FFFFFF',
  inset: '#F3F3F9',
  border: '#EAEAEC',
  text: '#1A1C20',
  textSecondary: '#5F6368',
  textTertiary: '#7D828A',
  primary: '#356BDB',
  primaryText: '#0951C1',
  primarySoft: '#E3EAFD',
  onPrimary: '#FFFFFF',
  sage: '#2A9D8F',
  sageSoft: '#D5F4EF',
  amber: '#E07A5F',
  amberSoft: '#FCE6DF',
  slate: '#6C7A89',
  error: '#BA1A1A',
  errorSoft: '#FFDAD6',
  inverse: '#1A1C20',
  onInverse: '#FFFFFF',
  track: '#EAEAEC',
  idle: '#D0D3D8',
  overlay: 'rgba(26,28,32,0.32)',
};

export const dark: Palette = {
  background: '#121316',
  card: '#1B1C20',
  inset: '#24262B',
  border: '#2E3036',
  text: '#ECECF2',
  textSecondary: '#B6B9C1',
  textTertiary: '#8F949C',
  primary: '#356BDB',
  primaryText: '#A9C0FF',
  primarySoft: '#1F2B4A',
  onPrimary: '#FFFFFF',
  sage: '#5CC7B8',
  sageSoft: '#173B37',
  amber: '#F09A82',
  amberSoft: '#40261F',
  slate: '#9AA6B2',
  error: '#FFB4AB',
  errorSoft: '#5C1A17',
  inverse: '#ECECF2',
  onInverse: '#121316',
  track: '#30333A',
  idle: '#50545C',
  overlay: 'rgba(0,0,0,0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 36, letterSpacing: -0.42 },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  headlineSm: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.09 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  labelLg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  labelMd: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  labelSm: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sheet: {
    shadowColor: '#1A1C20',
    shadowOpacity: 0.1,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
