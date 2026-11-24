import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, IconTile, Row, Stack } from '@/components/card';
import { Chip, ChipGroup, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, PageTitle, Pill } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DEFAULT_TRIGGERS, HELP_IDEAS, OBSTACLES } from '@/copy';
import { saveReflection } from '@/data/actions';
import { useStore } from '@/data/store';
import { formatShort } from '@/domain/dates';
import { occurrence } from '@/domain/schedule';
import type { Obstacle } from '@/domain/types';
import { useGoal, useHabit, useIndex, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { selectionHaptic, successHaptic } from '@/services/haptics';
import { radius, spacing } from '@/theme/tokens';

import { STATUS_LABEL, statusTone } from '../habits/common';

export function ReflectionScreen({ habitId, date }: { habitId?: string; date?: string }) {
  const c = useColors();
  const today = useToday();
  const day = date || today;
  const habit = useHabit(habitId);
  const goal = useGoal(habit?.goalId ?? undefined);
  const idx = useIndex();
  const existing = useStore((s) => s.data.reflections.find((r) => r.habitId === habitId && r.date === day));

  const [obstacles, setObstacles] = useState<Obstacle[]>(existing?.obstacles ?? []);
  const [triggers, setTriggers] = useState<string[]>(existing?.triggers ?? []);
  const [help, setHelp] = useState(existing?.helpNextTime ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  if (!habit) {
    return (
      <Screen title="Reflection" close>
        <EmptyState icon="search-off" title="Habit not found" body="It may have been removed." actionLabel="Close" onAction={() => goBack()} />
      </Screen>
    );
  }

  const occ = occurrence(habit, day, idx, today);
  const v = occ.version;
  const reduce = habit.kind === 'reduce';
  const triggerOptions = Array.from(new Set([...(v.reduce?.triggers ?? []), ...DEFAULT_TRIGGERS, ...triggers]));
  const toggle = (o: Obstacle) => {
    selectionHaptic();
    setObstacles((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  };

  const save = () => {
    saveReflection({
      habitId: habit.id,
      date: day,
      obstacles,
      triggers,
      helpNextTime: help.trim() || null,
      note: note.trim() || null,
    });
    successHaptic();
    goBack(`/habit/${habit.id}`);
  };

  return (
    <Screen
      title="Reflection"
      close
      avatar
      footer={
        <>
          <Button title="Save reflection" icon="check" onPress={save} testID="save-reflection" />
          <Button title="Skip for now" variant="ghost" onPress={() => goBack(`/habit/${habit.id}`)} />
        </>
      }>
      <Pill label="Optional moment" tone="primary" icon="spa" />
      <PageTitle
        title={day === today ? 'What got in the way today?' : `What got in the way on ${formatShort(day)}?`}
        subtitle="Noticing what happened turns friction into information. There's no wrong answer, and nothing here is required."
      />

      <Card>
        <Row gap={spacing.md}>
          <IconTile tone={reduce ? 'amber' : 'primary'}>
            <Icon name={habit.icon} color={reduce ? c.amber : c.primaryText} />
          </IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSm">{habit.title}</Text>
            {goal ? (
              <Text variant="bodySm" tone="secondary">
                {goal.title}
              </Text>
            ) : null}
          </View>
          {occ.status !== 'none' && occ.status !== 'upcoming' ? <Pill label={STATUS_LABEL[occ.status]} tone={statusTone(occ.status)} /> : null}
        </Row>
      </Card>

      <Row justify="space-between">
        <Text variant="labelSm" tone="secondary" uppercase>
          What made it harder
        </Text>
        <Text variant="labelMd" tone="tertiary">
          Select any that apply
        </Text>
      </Row>
      <View style={styles.grid}>
        {OBSTACLES.map((o) => {
          const on = obstacles.includes(o.value);
          return (
            <Pressable
              key={o.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.label}, ${o.hint}`}
              onPress={() => toggle(o.value)}
              style={[
                styles.cell,
                { backgroundColor: on ? c.primarySoft : c.card, borderColor: on ? c.primary : c.border },
              ]}>
              <Row justify="space-between">
                <Icon name={o.icon} color={on ? c.primaryText : c.textSecondary} />
                <View
                  style={[
                    styles.radio,
                    { borderColor: on ? c.primary : c.idle, backgroundColor: on ? c.primary : 'transparent' },
                  ]}>
                  {on ? <Icon name="check" size={12} color={c.onPrimary} /> : null}
                </View>
              </Row>
              <Text variant="labelLg">{o.label}</Text>
              <Text variant="bodySm" tone="tertiary">
                {o.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {reduce || obstacles.includes('urge') ? (
        <Stack gap={spacing.sm}>
          <Text variant="labelSm" tone="secondary" uppercase>
            Triggers (optional)
          </Text>
          <ChipGroup multiple small options={triggerOptions.map((t) => ({ value: t, label: t }))} value={triggers} onChange={(v2) => setTriggers(v2 as string[])} />
        </Stack>
      ) : null}

      <Banner
        icon="lightbulb-outline"
        title="A gentle refocus"
        body={
          v.build?.minimum != null
            ? `On low-energy days, the minimum version (${v.build.minimum} ${v.build.trackingType === 'duration' ? 'min' : v.build.unit}) is always there.`
            : 'Rest is information, not defeat. Tomorrow is a fresh opportunity.'
        }
      />

      <Stack gap={spacing.sm}>
        <Text variant="labelLg">
          What could help next time? <Text variant="bodySm" tone="tertiary">(Optional)</Text>
        </Text>
        <TextField
          value={help}
          onChangeText={setHelp}
          placeholder="e.g. Switch to the minimum version, or practise right after my morning coffee"
          multiline
          maxLength={280}
          accessibilityLabel="What could help next time"
        />
        <Row wrap gap={spacing.sm}>
          {HELP_IDEAS.map((h) => (
            <Chip key={h} small label={`+ ${h}`} selected={help === h} onPress={() => setHelp(h)} />
          ))}
        </Row>
      </Stack>

      <Stack gap={spacing.sm}>
        <Text variant="labelLg">
          A note for yourself <Text variant="bodySm" tone="tertiary">(Optional)</Text>
        </Text>
        <TextField value={note} onChangeText={setNote} placeholder="Anything else worth remembering" multiline maxLength={400} accessibilityLabel="Note" />
      </Stack>

      <Text variant="bodySm" tone="tertiary" center>
        LifeOS looks at patterns, not compliance. Every reflection helps you understand your rhythm.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '48.5%', flexGrow: 1, flexBasis: '45%', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: 4, minHeight: 96 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
