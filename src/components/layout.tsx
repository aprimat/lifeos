import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Uppercase section label with optional right-side text/action. */
export function SectionHeader({ title, right, icon }: { title: string; right?: ReactNode; icon?: IconName | string }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionLeft}>
        {icon ? <Icon name={icon} size={18} color={c.textSecondary} /> : null}
        <Text variant="labelSm" tone="secondary" uppercase accessibilityRole="header">
          {title}
        </Text>
      </View>
      {typeof right === 'string' ? (
        <Text variant="labelMd" tone="tertiary">
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

/** Large page title with optional eyebrow and subtitle. */
export function PageTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {eyebrow ? (
        <Text variant="labelSm" tone="accent" uppercase>
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="headlineLg" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyMd" tone="secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Wizard progress: "STEP 2 OF 3" with a thin bar. */
export function StepHeader({ step, total, label }: { step: number; total: number; label?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.sectionLeft}>
        <Text variant="labelSm" tone="accent" uppercase>
          Step {step} of {total}
          {label ? ` · ${label}` : ''}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.track }]} accessibilityLabel={`Step ${step} of ${total}`}>
        <View style={[styles.fill, { width: `${(step / total) * 100}%`, backgroundColor: c.primary }]} />
      </View>
    </View>
  );
}

export type Tone = 'neutral' | 'primary' | 'sage' | 'amber' | 'error' | 'dark';

export function useTone(tone: Tone) {
  const c = useColors();
  return {
    neutral: { bg: c.inset, fg: c.textSecondary },
    primary: { bg: c.primarySoft, fg: c.primaryText },
    sage: { bg: c.sageSoft, fg: c.sage },
    amber: { bg: c.amberSoft, fg: c.amber },
    error: { bg: c.errorSoft, fg: c.error },
    dark: { bg: c.inverse, fg: c.onInverse },
  }[tone];
}

/** Small rounded label. */
export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName | string }) {
  const t = useTone(tone);
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} /> : null}
      <Text variant="labelMd" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

/** Calm informational box (DESIGN.md inset surface). */
export function Banner({
  title,
  body,
  icon = 'spa',
  tone = 'neutral',
  action,
}: {
  title?: string;
  body: string;
  icon?: IconName | string;
  tone?: Tone;
  action?: ReactNode;
}) {
  const c = useColors();
  const t = useTone(tone);
  return (
    <View style={[styles.banner, { backgroundColor: tone === 'neutral' ? c.inset : t.bg }]}>
      <View style={[styles.bannerIcon, { backgroundColor: c.card }]}>
        <Icon name={icon} size={18} color={tone === 'neutral' ? c.sage : t.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text variant="labelLg">{title}</Text> : null}
        <Text variant="bodySm" tone="secondary">
          {body}
        </Text>
        {action}
      </View>
    </View>
  );
}

export function EmptyState({
  icon = 'spa',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName | string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.empty, { borderColor: c.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={26} color={c.primaryText} />
      </View>
      <Text variant="headlineSm" center>
        {title}
      </Text>
      <Text variant="bodyMd" tone="secondary" center>
        {body}
      </Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} icon="add" style={{ alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

/** Labelled field wrapper. */
export function Field({ label, optional, hint, children, right }: { label: string; optional?: boolean; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.section}>
        <Text variant="labelLg">{label}</Text>
        {optional ? <Pill label="Optional" /> : right}
      </View>
      {children}
      {hint ? (
        <Text variant="bodySm" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, alignItems: 'flex-start' },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
