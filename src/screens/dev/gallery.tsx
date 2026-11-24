import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DEV_TOOLS } from '@/config/flags';
import { Button, IconButton } from '@/components/button';
import { Card, IconTile, Row, Stack } from '@/components/card';
import {
  CheckCircle,
  Chip,
  ChipGroup,
  Group,
  ListRow,
  ScalePicker,
  SegmentedControl,
  SelectableCard,
  Stepper,
  TextField,
  TimePicker,
  ToggleRow,
  WeekdayPicker,
} from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, PageTitle, Pill, SectionHeader, StepHeader } from '@/components/layout';
import { BarChart, BreakdownBar, BreakdownLegend, ProgressBar, ProgressRing, StatusDay } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { updateSettings } from '@/data/actions';
import { useStore } from '@/data/store';
import { emptyBreakdown } from '@/domain/analytics';
import type { DayStatus } from '@/domain/schedule';
import { dark, light, radius, spacing, typography, type Palette, type TypographyVariant } from '@/theme/tokens';

/**
 * Development-only design-system gallery (IMPLEMENTATION_PLAN.md 1.2–1.3):
 * colour tokens for both palettes, the type scale, and every shared component.
 * Switch the theme at the top to check light and dark.
 */
export function Gallery() {
  const theme = useStore((s) => s.data.settings.theme);
  const [chip, setChip] = useState<string>('a');
  const [multi, setMulti] = useState<string[]>(['a']);
  const [seg, setSeg] = useState<'week' | 'month'>('week');
  const [sel, setSel] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [text, setText] = useState('');
  const [step, setStep] = useState(10);
  const [scale, setScale] = useState<number | null>(3);
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const [time, setTime] = useState('08:00');
  const [sheet, setSheet] = useState(false);

  if (!DEV_TOOLS) return <Redirect href="/today" />;

  const breakdown = { ...emptyBreakdown(), eligible: 10, done: 7, full: 5, minimum: 2, skipped: 1, missed: 2 };
  const statuses: DayStatus[] = ['full', 'minimum', 'partial', 'skipped', 'missed', 'rest', 'over', 'upcoming', 'none'];

  return (
    <Screen back title="Design system">
      <SegmentedControl
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={theme}
        onChange={(v) => updateSettings({ theme: v })}
      />

      <SectionHeader title="Colour tokens" />
      <Swatches name="Light" palette={light} />
      <Swatches name="Dark" palette={dark} />

      <SectionHeader title="Typography" />
      <Card>
        <Stack>
          {(Object.keys(typography) as TypographyVariant[]).map((v) => (
            <Text key={v} variant={v}>
              {v} · 1234 Steady rhythm
            </Text>
          ))}
          <Text tabular variant="headlineLg">
            88% · 21 / 24
          </Text>
        </Stack>
      </Card>

      <SectionHeader title="Buttons" />
      <Stack>
        <Button title="Primary" icon="check" />
        <Button title="Secondary" variant="secondary" />
        <Button title="Ghost" variant="ghost" />
        <Button title="Dark" variant="dark" icon="add" />
        <Button title="Danger" variant="danger" />
        <Button title="Disabled" disabled />
        <Row>
          <Button title="Small" size="sm" />
          <IconButton icon="more-horiz" accessibilityLabel="More" filled />
        </Row>
      </Stack>

      <SectionHeader title="Layout" />
      <PageTitle eyebrow="Eyebrow" title="Page title" subtitle="Subtitle text in secondary tone." />
      <StepHeader step={2} total={3} label="Schedule" />
      <Row wrap>
        {(['neutral', 'primary', 'sage', 'amber', 'error', 'dark'] as const).map((t) => (
          <Pill key={t} label={t} tone={t} />
        ))}
      </Row>
      <Banner title="Planned rest is not a missed day." body="Calm informational banner." />
      <EmptyState title="Empty state" body="Guides the first action." actionLabel="Add a habit" onAction={() => {}} />
      <Card>
        <Row>
          <IconTile>
            <Icon name="spa" />
          </IconTile>
          <IconTile tone="primary">
            <Icon name="flag" />
          </IconTile>
          <IconTile tone="sage">
            <Icon name="check" />
          </IconTile>
          <IconTile tone="amber">
            <Icon name="smartphone" />
          </IconTile>
        </Row>
      </Card>

      <SectionHeader title="Controls" />
      <ChipGroup options={[{ value: 'a', label: 'Morning' }, { value: 'b', label: 'Evening' }]} value={chip} onChange={(v) => setChip(v as string)} />
      <ChipGroup multiple small options={[{ value: 'a', label: 'Boredom' }, { value: 'b', label: 'Stress' }]} value={multi} onChange={(v) => setMulti(v as string[])} />
      <Chip label="Single chip" icon="add" />
      <SegmentedControl options={[{ value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]} value={seg} onChange={setSeg} />
      <SelectableCard title="Selectable card" description="With description" icon="explore" eyebrow="Eyebrow" selected={sel} onPress={() => setSel(!sel)} />
      <TextField value={text} onChangeText={setText} placeholder="Text field" maxLength={80} showCount />
      <TextField value="" placeholder="With error" error="Something needs attention." />
      <Stepper value={step} onChange={setStep} unit="min" step={5} />
      <ScalePicker value={scale} onChange={setScale} labels={['Low', '', 'Moderate', '', 'Peak']} />
      <WeekdayPicker value={days} onChange={setDays} />
      <TimePicker value={time} onChange={setTime} />
      <Group>
        <ToggleRow title="Toggle row" subtitle="Subtitle" icon="notifications-none" value={toggle} onChange={setToggle} />
        <ListRow title="List row" subtitle="With value" icon="tune" value="Value" onPress={() => {}} />
        <ListRow title="Danger row" icon="delete-outline" danger onPress={() => {}} />
      </Group>
      <Row wrap>
        {(['idle', 'done', 'minimum', 'partial', 'skipped', 'rest', 'over'] as const).map((s) => (
          <CheckCircle key={s} state={s} label={s} />
        ))}
      </Row>
      <Button title="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Bottom sheet">
        <Text>Sheets rise from the bottom with 24px corners.</Text>
      </Sheet>

      <SectionHeader title="Progress" />
      <Card>
        <Stack gap={spacing.md}>
          <ProgressBar value={0.6} />
          <BreakdownBar b={breakdown} />
          <BreakdownLegend b={breakdown} />
          <Row>
            <ProgressRing value={0.7} label="70%" />
            <ProgressRing value={null} label="—" />
          </Row>
          <Row wrap>
            {statuses.map((s) => (
              <StatusDay key={s} status={s} label={s} />
            ))}
          </Row>
          <BarChart
            data={['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => ({ label: l, value: [25, 30, 40, 35, null, 20, 15][i] }))}
            lines={[{ value: 30, color: light.primary, dashed: true }]}
          />
        </Stack>
      </Card>
    </Screen>
  );
}

function Swatches({ name, palette }: { name: string; palette: Palette }) {
  return (
    <View style={{ backgroundColor: palette.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: palette.border }}>
      <Text variant="labelLg" color={palette.text}>
        {name}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(Object.keys(palette) as (keyof Palette)[]).map((k) => (
          <View key={k} style={{ width: 96, gap: 2 }}>
            <View style={{ height: 32, borderRadius: radius.sm, backgroundColor: palette[k], borderWidth: 1, borderColor: palette.border }} />
            <Text variant="labelSm" color={palette.textSecondary} numberOfLines={1}>
              {k}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
