import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ChipGroup, ScalePicker, Stepper, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Pill } from '@/components/layout';
import { BarChart, ProgressBar } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { DEFAULT_TRIGGERS } from '@/copy';
import { clearLog, saveReflection, setLog, updateHabit } from '@/data/actions';
import { useStore } from '@/data/store';
import { reduceTrend } from '@/domain/analytics';
import { weekdayIndex, weekdayLetter } from '@/domain/dates';
import { occurrence } from '@/domain/schedule';
import type { Habit } from '@/domain/types';
import { useIndex, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { successHaptic } from '@/services/haptics';
import { spacing } from '@/theme/tokens';

import { ArchivedBanner, ConfirmSheet, HabitHeader, HabitMenu, SafetySheet } from './common';

export function ReduceHabitDetails({ habit }: { habit: Habit }) {
  const c = useColors();
  const today = useToday();
  const idx = useIndex();
  const reflections = useStore((s) => s.data.reflections);
  const occ = occurrence(habit, today, idx, today);
  const reduce = occ.version.reduce!;
  const unit = reduce.unit;
  const step = unit === 'min' ? 5 : 1;
  const existingReflection = reflections.find((r) => r.habitId === habit.id && r.date === today);

  const [value, setValue] = useState<number>(occ.log?.value ?? 0);
  const [urgesOn, setUrgesOn] = useState(occ.log?.urges != null);
  const [urges, setUrges] = useState<number>(occ.log?.urges ?? 0);
  const [intensity, setIntensity] = useState<number | null>(occ.log?.urgeIntensity ?? null);
  const [triggers, setTriggers] = useState<string[]>(existingReflection?.triggers ?? []);
  const [note, setNote] = useState(existingReflection?.note ?? '');
  const [saved, setSaved] = useState<string | null>(null);
  const [limitSheet, setLimitSheet] = useState(false);
  const [newLimit, setNewLimit] = useState(reduce.limit);
  const [taperConfirm, setTaperConfirm] = useState(false);
  const [safety, setSafety] = useState(false);

  useEffect(() => {
    setValue(occ.log?.value ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, occ.log?.id]);

  const trend = reduceTrend(habit, today, 7, idx);
  const over = value > reduce.limit;
  const presets = unit === 'min' ? [0, 15, 30, 45, 60, 90] : [0, 1, 2, 3, 5, 8];
  const triggerOptions = Array.from(new Set([...reduce.triggers, ...DEFAULT_TRIGGERS, ...triggers]));
  const archived = habit.status === 'archived';
  const finalTarget = reduce.finalTarget ?? 0;
  const nextStep = Math.max(finalTarget, reduce.limit - Math.max(step, Math.round(reduce.limit * 0.15)));
  const canTaper = reduce.mode === 'taper' && !reduce.sensitive && reduce.limit > finalTarget;
  const maxScale = Math.max(reduce.baseline ?? 0, reduce.limit * 2, value, 10);

  const save = () => {
    setLog(habit.id, today, {
      status: 'logged',
      value,
      urges: urgesOn ? urges : null,
      urgeIntensity: urgesOn ? intensity : null,
    });
    if (triggers.length || note.trim() || existingReflection) {
      saveReflection({
        habitId: habit.id,
        date: today,
        obstacles: triggers.length ? ['urge'] : existingReflection?.obstacles ?? [],
        triggers,
        helpNextTime: existingReflection?.helpNextTime ?? null,
        note: note.trim() || null,
      });
    }
    successHaptic();
    setSaved(
      over
        ? "Saved. Over today's limit — noticing it is already useful."
        : reduce.mode === 'avoid' && value === 0
          ? 'Saved. You stayed clear today.'
          : "Saved. Within today's limit.",
    );
  };

  return (
    <Screen title="Habit details" back right={<HabitMenu habit={habit} />}>
      <HabitHeader habit={habit} occ={occ} />
      <ArchivedBanner habit={habit} />

      <Card>
        <Row justify="space-between" align="flex-start">
          <View style={{ gap: 2 }}>
            <Text variant="labelSm" tone="tertiary" uppercase>
              {reduce.mode === 'avoid' ? 'Aim' : 'Current daily limit'}
            </Text>
            <Text variant="headlineLg" tabular>
              {reduce.mode === 'avoid' ? 'Avoid' : reduce.limit}
              {reduce.mode !== 'avoid' ? <Text variant="bodyMd" tone="secondary">{` ${unit} / day`}</Text> : null}
            </Text>
            {reduce.mode === 'taper' && reduce.finalTarget !== null ? (
              <Text variant="bodySm" tone="secondary">
                Working toward {reduce.finalTarget} {unit}
              </Text>
            ) : null}
          </View>
          {reduce.baseline !== null ? (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text variant="labelSm" tone="tertiary" uppercase>
                Baseline
              </Text>
              <Text variant="headlineSm" tone="amber" tabular>
                {reduce.baseline} {unit}
              </Text>
            </View>
          ) : null}
        </Row>
      </Card>

      {!archived ? (
        <Card>
          <Stack gap={spacing.md}>
            <Row justify="space-between">
              <View>
                <Text variant="labelSm" tone="secondary" uppercase>
                  Today's log
                </Text>
                <Text variant="headlineSm">{unit === 'min' ? 'About how many minutes?' : `How many ${unit}?`}</Text>
              </View>
              {occ.log ? <Pill label="Logged" tone="primary" icon="check" /> : null}
            </Row>
            {!occ.planned && occ.status !== 'rest' && !occ.log ? (
              <Text variant="bodySm" tone="secondary">
                Not on today's plan — you can still log it.
              </Text>
            ) : null}
            <Stepper value={value} onChange={setValue} min={0} max={9999} step={step} unit={unit} large />
            <Row wrap gap={spacing.sm}>
              {presets.map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={`${p} ${unit}`}
                  onPress={() => setValue(p)}
                  style={[styles.preset, { backgroundColor: value === p ? c.sageSoft : c.inset }]}>
                  <Text variant="labelLg" color={value === p ? c.sage : c.text}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </Row>
            {reduce.mode !== 'avoid' ? (
              <Stack gap={spacing.xs}>
                <ProgressBar value={value / maxScale} color={over ? c.amber : c.sage} />
                <Row justify="space-between">
                  <Text variant="labelMd" tone="tertiary">
                    0
                  </Text>
                  <Text variant="labelMd" tone="tertiary">
                    Limit {reduce.limit}
                  </Text>
                  {reduce.baseline !== null ? (
                    <Text variant="labelMd" tone="tertiary">
                      Baseline {reduce.baseline}
                    </Text>
                  ) : null}
                </Row>
              </Stack>
            ) : null}
            <Text variant="bodySm" color={over ? c.amber : c.sage}>
              {over
                ? `Over today's limit by ${value - reduce.limit} ${unit}. Notice it without judgement — it's information.`
                : reduce.mode === 'avoid'
                  ? value === 0
                    ? 'None so far today.'
                    : `${value} logged.`
                  : `Within today's limit${reduce.baseline !== null && value < reduce.baseline ? ` — ${reduce.baseline - value} ${unit} below your baseline` : ''}.`}
            </Text>

            <Pressable accessibilityRole="switch" accessibilityState={{ checked: urgesOn }} onPress={() => setUrgesOn(!urgesOn)} style={styles.linkRow}>
              <Icon name={urgesOn ? 'expand-less' : 'expand-more'} size={20} color={c.primaryText} />
              <Text variant="labelLg" tone="accent">
                {urgesOn ? 'Hide urges' : 'Track urges (optional)'}
              </Text>
            </Pressable>
            {urgesOn ? (
              <Stack gap={spacing.sm}>
                <Text variant="labelLg">Urges noticed today</Text>
                <Stepper value={urges} onChange={setUrges} min={0} max={99} unit="urges" />
                <Text variant="labelLg">How strong were they?</Text>
                <ScalePicker value={intensity} onChange={setIntensity} labels={['Mild', '', 'Moderate', '', 'Strong']} />
              </Stack>
            ) : null}

            <Text variant="labelLg">What invited it today? (optional)</Text>
            <ChipGroup multiple small options={triggerOptions.map((t) => ({ value: t, label: t }))} value={triggers} onChange={(v) => setTriggers(v as string[])} />
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="A short note for yourself"
              multiline
              maxLength={300}
              accessibilityLabel="Personal note"
            />
            <Button title="Save today's log" icon="done-all" onPress={save} testID="save-reduce-log" />
            {occ.log ? (
              <Button
                title="Clear today's log"
                variant="ghost"
                size="sm"
                onPress={() => {
                  clearLog(habit.id, today);
                  setValue(0);
                  setSaved(null);
                }}
              />
            ) : null}
            {saved ? (
              <Text variant="bodySm" tone={over ? 'amber' : 'sage'} accessibilityLiveRegion="polite">
                {saved}
              </Text>
            ) : null}
            {saved && over ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(`/reflection?habitId=${habit.id}&date=${today}`)} style={styles.linkRow}>
                <Icon name="psychology-alt" size={18} color={c.primaryText} />
                <Text variant="labelLg" tone="accent">
                  Reflect: what could help next time?
                </Text>
              </Pressable>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={spacing.md}>
          <Row justify="space-between" align="flex-start">
            <View style={{ flex: 1 }}>
              <Text variant="headlineSm">Last 7 days</Text>
              <Text variant="bodySm" tone="secondary">
                {trend.loggedDays} of 7 days logged
              </Text>
            </View>
            {trend.average !== null ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="headlineSm" tone="sage" tabular>
                  {Math.round(trend.average)} {unit}/day
                </Text>
                <Text variant="labelMd" tone="tertiary">
                  average
                </Text>
              </View>
            ) : null}
          </Row>
          <BarChart
            data={trend.series.map((s) => ({
              label: weekdayLetter(weekdayIndex(s.date)),
              value: s.value,
              color: s.within === false ? c.amber : c.sage,
            }))}
            lines={[
              ...(reduce.mode !== 'avoid' ? [{ value: trend.limit, color: c.primary, dashed: true }] : []),
              ...(trend.baseline !== null ? [{ value: trend.baseline, color: c.slate }] : []),
            ]}
          />
          <Row wrap gap={spacing.md}>
            {reduce.mode !== 'avoid' ? <Legend color={c.primary} label={`Limit ${trend.limit} ${unit}`} /> : null}
            {trend.baseline !== null ? <Legend color={c.slate} label={`Baseline ${trend.baseline} ${unit}`} /> : null}
          </Row>
          {trend.changeVsBaseline !== null ? (
            <Text variant="bodySm" tone="secondary">
              {trend.changeVsBaseline <= 0
                ? `${Math.round(-trend.changeVsBaseline * 100)}% below your baseline this week.`
                : `${Math.round(trend.changeVsBaseline * 100)}% above your baseline this week. Patterns shift — keep noticing.`}
            </Text>
          ) : null}
        </Stack>
      </Card>

      {!archived && reduce.mode !== 'avoid' ? (
        <Card>
          <Stack gap={spacing.sm}>
            <Text variant="headlineSm">Limit and pace</Text>
            <Button
              title={`Adjust daily limit (currently ${reduce.limit} ${unit})`}
              variant="secondary"
              icon="tune"
              onPress={() => {
                setNewLimit(reduce.limit);
                setLimitSheet(true);
              }}
            />
            {canTaper ? (
              <Button title={`Next step: ${nextStep} ${unit} per day`} variant="secondary" icon="south" onPress={() => setTaperConfirm(true)} />
            ) : null}
            <Text variant="bodySm" tone="tertiary">
              Changes apply from today. Nothing changes unless you confirm it.
            </Text>
          </Stack>
        </Card>
      ) : null}

      {reduce.sensitive ? (
        <Card onPress={() => setSafety(true)} accessibilityLabel="About support">
          <Row gap={spacing.md}>
            <Icon name="health-and-safety" color={c.primaryText} />
            <Text variant="labelLg" tone="accent" style={{ flex: 1 }}>
              About support
            </Text>
            <Icon name="chevron-right" color={c.textTertiary} />
          </Row>
        </Card>
      ) : null}

      <Banner
        icon="lightbulb-outline"
        title="Reducing is not depriving"
        body="When you notice an urge and log it, you've already created a pause between impulse and action."
      />

      <Sheet visible={limitSheet} onClose={() => setLimitSheet(false)} title="Daily limit">
        <Stepper value={newLimit} onChange={setNewLimit} min={0} max={9999} step={step} unit={unit} large />
        <Text variant="bodySm" tone="tertiary">
          Applies from today. Past days keep the limit they had.
        </Text>
        <Button
          title="Save limit"
          icon="check"
          onPress={() => {
            updateHabit(habit.id, {}, { reduce: { ...reduce, limit: newLimit } });
            setLimitSheet(false);
          }}
        />
      </Sheet>

      <ConfirmSheet
        visible={taperConfirm}
        onClose={() => setTaperConfirm(false)}
        title="Take the next step?"
        body={`Your daily limit would move from ${reduce.limit} to ${nextStep} ${unit}, starting today. You can change it back any time.`}
        confirmLabel="Yes, step down"
        onConfirm={() => {
          updateHabit(habit.id, {}, { reduce: { ...reduce, limit: nextStep } });
          setTaperConfirm(false);
        }}
      />

      <SafetySheet visible={safety} onClose={() => setSafety(false)} habit={habit} />
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 14, height: 2, backgroundColor: color }} />
      <Text variant="labelMd" tone="secondary">
        {label}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  preset: { minWidth: 52, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
});
