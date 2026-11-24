import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ChipGroup, Stepper, TextField, TimePicker } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Field, PageTitle, Pill, SectionHeader } from '@/components/layout';
import { Metric, StatusDay } from '@/components/progress';
import { goBack, Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TIME_OF_DAY } from '@/copy';
import { applySuggestion, saveWeeklyReview } from '@/data/actions';
import { consistency, dailySeries, habitBreakdown, habitsBreakdown, minutesInRange, pct } from '@/domain/analytics';
import { addDays, formatRange, formatShort, maxDate, minutesLabel, startOfWeek, weekdayIndex, weekdayLetter } from '@/domain/dates';
import type { DayStatus } from '@/domain/schedule';
import { generateSuggestions, type SuggestedChange, type Suggestion } from '@/domain/suggestions';
import type { SuggestionDecision, TimeOfDay, WeeklyReview } from '@/domain/types';
import { useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

type Decision = WeeklyReview['decisions'][number];

export function WeeklyReviewScreen() {
  const c = useColors();
  const today = useToday();
  const params = useLocalSearchParams<{ week?: string }>();
  const week = params.week ?? addDays(startOfWeek(today), -7);
  const weekEnd = addDays(week, 6);
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const existing = data.weeklyReviews.find((r) => r.weekStart === week);

  // Changes start the week after the reviewed one — never in the past.
  const applyFrom = maxDate(addDays(week, 7), today);

  const [gaveEnergy, setGaveEnergy] = useState(existing?.gaveEnergy ?? '');
  const [feltHeavy, setFeltHeavy] = useState(existing?.feltHeavy ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [decisions, setDecisions] = useState<Decision[]>(existing?.decisions ?? []);
  const [editing, setEditing] = useState<Suggestion | null>(null);

  const series = useMemo(() => dailySeries(habits, week, weekEnd, idx, today), [habits, week, weekEnd, idx, today]);
  const breakdown = useMemo(() => habitsBreakdown(habits, week, weekEnd, idx, today), [habits, week, weekEnd, idx, today]);
  const minutes = useMemo(() => minutesInRange(habits, week, weekEnd, idx), [habits, week, weekEnd, idx]);

  const hints = useMemo(() => {
    const rows = habits
      .filter((h) => h.startDate <= weekEnd)
      .map((h) => ({ habit: h, b: habitBreakdown(h, week, weekEnd, idx, today) }))
      .filter((r) => r.b.eligible > 0);
    const steadiest = [...rows].filter((r) => r.b.done > 0).sort((a, b) => b.b.done / b.b.eligible - a.b.done / a.b.eligible || b.b.done - a.b.done)[0];
    const hardest = [...rows]
      .map((r) => ({ ...r, gaps: r.b.skipped + r.b.missed + r.b.notLogged + r.b.over }))
      .filter((r) => r.gaps > 0)
      .sort((a, b) => b.gaps - a.gaps)[0];
    return { steadiest, hardest };
  }, [habits, week, weekEnd, idx, today]);

  const suggestions = useMemo(
    () => generateSuggestions({ habits, reflections: data.reflections, automaticity: data.automaticity, idx, today }),
    [habits, data.reflections, data.automaticity, idx, today],
  );
  const decided = new Map(decisions.map((d) => [d.suggestionId, d.decision]));

  const whyGoal = data.goals.find((g) => g.status === 'active' && g.myWhy);

  const decide = (s: Suggestion, decision: SuggestionDecision, change?: SuggestedChange) => {
    if (decision !== 'dismissed') applySuggestion(s.habitId, change ?? s.change, applyFrom);
    setDecisions((prev) => [...prev.filter((d) => d.suggestionId !== s.id), { suggestionId: s.id, habitId: s.habitId, rule: s.rule, decision }]);
  };

  const save = () => {
    saveWeeklyReview({
      weekStart: week,
      gaveEnergy: gaveEnergy.trim() || null,
      feltHeavy: feltHeavy.trim() || null,
      note: note.trim() || null,
      decisions,
      completedAt: new Date().toISOString(),
    });
    goBack('/progress');
  };

  const dayStatus = (d: (typeof series)[number]): DayStatus => {
    if (d.future) return 'none';
    if (d.planned === 0) return d.rest ? 'rest' : 'none';
    if (d.done >= d.planned) return 'full';
    if (d.done > 0) return 'partial';
    return 'missed';
  };

  return (
    <Screen
      title="Weekly review"
      back
      footer={<Button title={existing?.completedAt ? 'Update review' : 'Save review'} icon="check" onPress={save} />}>
      <PageTitle
        eyebrow={`Week of ${formatRange(week, weekEnd)}`}
        title="Your week in review"
        subtitle="A quiet look back: what gave you energy, what felt heavy, and what to adjust."
      />

      <Card>
        <Row justify="space-between">
          <Text variant="labelLg">Daily rhythm</Text>
          <Text variant="labelMd" tone="tertiary" tabular>
            {breakdown.done} of {breakdown.eligible} done
          </Text>
        </Row>
        <Row justify="space-between" style={{ marginTop: spacing.md }}>
          {series.map((d) => (
            <View key={d.date} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <Text variant="labelMd" tone="tertiary">
                {weekdayLetter(weekdayIndex(d.date))}
              </Text>
              <StatusDay status={dayStatus(d)} size={32} label={formatShort(d.date)} />
              <Text variant="labelSm" tone="tertiary" tabular>
                {d.planned ? `${d.done}/${d.planned}` : d.rest ? 'rest' : '–'}
              </Text>
            </View>
          ))}
        </Row>
        {breakdown.rest ? (
          <Row gap={6} style={{ marginTop: spacing.md }}>
            <Icon name="bedtime" size={16} color={c.sage} />
            <Text variant="bodySm" tone="secondary">
              {breakdown.rest} planned rest {breakdown.rest === 1 ? 'day' : 'days'} respected
            </Text>
          </Row>
        ) : null}
      </Card>

      <Row gap={spacing.sm} align="stretch">
        <Card style={{ flex: 1 }}>
          <Metric label="Consistency" value={pct(consistency(breakdown))} sub={`${breakdown.done} of ${breakdown.eligible} planned sessions`} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Metric label="Time invested" value={minutes ? minutesLabel(minutes) : '—'} sub="Timed practice this week" />
        </Card>
      </Row>

      {hints.steadiest || hints.hardest ? (
        <Card inset>
          <Stack gap={spacing.sm}>
            {hints.steadiest ? (
              <Row gap={spacing.sm} align="flex-start">
                <Icon name="eco" size={18} color={c.sage} />
                <Text variant="bodySm" tone="secondary" style={{ flex: 1 }}>
                  Steadiest: “{hints.steadiest.habit.title}” — {hints.steadiest.b.done} of {hints.steadiest.b.eligible}.
                </Text>
              </Row>
            ) : null}
            {hints.hardest ? (
              <Row gap={spacing.sm} align="flex-start">
                <Icon name="waves" size={18} color={c.amber} />
                <Text variant="bodySm" tone="secondary" style={{ flex: 1 }}>
                  Harder to fit: “{hints.hardest.habit.title}” — {hints.hardest.gaps} {hints.hardest.gaps === 1 ? 'day' : 'days'} didn't go as planned.
                </Text>
              </Row>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <SectionHeader title="Observations" />
      <Card>
        <Field label="What gave you energy?" optional>
          <TextField value={gaveEnergy} onChangeText={setGaveEnergy} placeholder="Something that felt natural or good" multiline maxLength={500} />
        </Field>
      </Card>
      <Card>
        <Field label="What felt heavy?" optional>
          <TextField value={feltHeavy} onChangeText={setFeltHeavy} placeholder="Friction is information about your week, not your willpower" multiline maxLength={500} />
        </Field>
      </Card>
      <Card>
        <Field label="A note to yourself" optional>
          <TextField value={note} onChangeText={setNote} placeholder="Anything to carry into next week" multiline maxLength={500} />
        </Field>
      </Card>

      {whyGoal ? (
        <Card onPress={() => router.push(`/goal/${whyGoal.id}`)} accessibilityLabel="Revisit your why">
          <Row gap={spacing.md}>
            <Icon name="explore" size={22} color={c.primaryText} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="labelSm" tone="tertiary" uppercase>
                If it helps
              </Text>
              <Text variant="labelLg">Revisit your why</Text>
              <Text variant="bodySm" tone="secondary" numberOfLines={2}>
                “{whyGoal.myWhy}”
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={c.textTertiary} />
          </Row>
        </Card>
      ) : null}

      <SectionHeader title="Suggestions" right={suggestions.length ? `${suggestions.length}` : undefined} />
      {suggestions.length === 0 ? (
        <Banner icon="spa" body="No changes suggested. Your current plan looks like it fits — keeping it as is is a good choice." />
      ) : (
        <>
          <Text variant="bodySm" tone="secondary">
            Based on what you logged. Nothing changes unless you choose it. Changes start {applyFrom === today ? 'today' : formatShort(applyFrom)}; your past weeks stay as they were.
          </Text>
          {suggestions.map((s) => {
            const d = decided.get(s.id);
            return (
              <Card key={s.id} selected={d === 'accepted' || d === 'edited'}>
                <Stack gap={spacing.sm}>
                  <Row justify="space-between">
                    <Pill label={s.habitTitle} tone="primary" />
                    {d ? <Pill label={d === 'dismissed' ? 'Kept as is' : d === 'edited' ? 'Adjusted' : 'Applied'} tone={d === 'dismissed' ? 'neutral' : 'sage'} /> : null}
                  </Row>
                  <Text variant="headlineSm">{s.title}</Text>
                  <Text variant="bodyMd" tone="secondary">
                    {s.body}
                  </Text>
                  <Row gap={6} align="flex-start">
                    <Icon name="insights" size={16} color={c.textTertiary} />
                    <Text variant="bodySm" tone="tertiary" style={{ flex: 1 }}>
                      {s.evidence}
                    </Text>
                  </Row>
                  {!d ? (
                    <Row gap={spacing.sm} wrap>
                      <Button size="sm" title="Accept" icon="check" onPress={() => decide(s, 'accepted')} />
                      {s.change.kind !== 'plan' ? <Button size="sm" variant="secondary" title="Edit" icon="tune" onPress={() => setEditing(s)} /> : null}
                      <Button size="sm" variant="ghost" title="Dismiss" onPress={() => decide(s, 'dismissed')} />
                    </Row>
                  ) : null}
                </Stack>
              </Card>
            );
          })}
        </>
      )}

      <EditSuggestionSheet
        suggestion={editing}
        onClose={() => setEditing(null)}
        onApply={(s, change) => {
          decide(s, 'edited', change);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

function EditSuggestionSheet({
  suggestion,
  onClose,
  onApply,
}: {
  suggestion: Suggestion | null;
  onClose: () => void;
  onApply: (s: Suggestion, change: SuggestedChange) => void;
}) {
  const [num, setNum] = useState(0);
  const [time, setTime] = useState('08:00');
  const [tod, setTod] = useState<TimeOfDay>('morning');
  const [seededFor, setSeededFor] = useState<string | null>(null);

  if (suggestion && seededFor !== suggestion.id) {
    const ch = suggestion.change;
    if (ch.kind === 'target' || ch.kind === 'limit') setNum(ch.to);
    if (ch.kind === 'pause') setNum(ch.days);
    if (ch.kind === 'reminder') setTime(ch.time);
    if (ch.kind === 'timeOfDay') setTod(ch.to);
    setSeededFor(suggestion.id);
  }

  if (!suggestion) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const ch = suggestion.change;

  const build = (): SuggestedChange => {
    switch (ch.kind) {
      case 'target':
      case 'limit':
        return { ...ch, to: num };
      case 'pause':
        return { ...ch, days: num };
      case 'reminder':
        return { ...ch, time };
      case 'timeOfDay':
        return { ...ch, to: tod };
      default:
        return ch;
    }
  };

  return (
    <Sheet visible onClose={onClose} title={`Adjust · ${suggestion.habitTitle}`}>
      {ch.kind === 'target' || ch.kind === 'limit' ? (
        <Field label={ch.kind === 'target' ? 'New target' : 'New daily limit'} hint={`Currently ${ch.from} ${ch.unit}`}>
          <Stepper value={num} onChange={setNum} min={ch.kind === 'target' ? 1 : 0} step={ch.unit === 'min' ? 5 : 1} unit={ch.unit} />
        </Field>
      ) : null}
      {ch.kind === 'pause' ? (
        <Field label="Pause for">
          <Stepper value={num} onChange={setNum} min={1} max={30} unit="days" />
        </Field>
      ) : null}
      {ch.kind === 'reminder' ? (
        <Field label="Reminder time">
          <TimePicker value={time} onChange={setTime} />
        </Field>
      ) : null}
      {ch.kind === 'timeOfDay' ? (
        <Field label="Time of day">
          <ChipGroup options={TIME_OF_DAY} value={tod} onChange={(v) => setTod(v as TimeOfDay)} />
        </Field>
      ) : null}
      <Button title="Apply this change" icon="check" onPress={() => onApply(suggestion, build())} />
    </Sheet>
  );
}
