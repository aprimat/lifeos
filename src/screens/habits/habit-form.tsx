import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import {
  ChipGroup,
  Chip,
  Group,
  SegmentedControl,
  SelectableCard,
  Stepper,
  TextField,
  TimePicker,
  ToggleRow,
  WeekdayPicker,
} from '@/components/controls';
import { HABIT_ICONS, Icon } from '@/components/icon';
import { Banner, Field, PageTitle, Pill, SectionHeader, StepHeader } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { DEFAULT_TRIGGERS, EXCEPTION_KINDS, REDUCE_MODES, SAFETY, TIME_OF_DAY } from '@/copy';
import {
  addException,
  completeOnboarding,
  createHabit,
  removeException,
  updateHabit,
  updateSettings,
} from '@/data/actions';
import { useStore } from '@/data/store';
import { formatRange, formatTime, maxDate } from '@/domain/dates';
import { currentVersion, isAlcohol, isSensitiveBehavior, scheduleMatches } from '@/domain/schedule';
import type {
  ExceptionKind,
  Habit,
  HabitKind,
  HabitVersion,
  ISODate,
  ReduceMode,
  Schedule,
  TimeOfDay,
  TrackingType,
} from '@/domain/types';
import { useCommitment, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { requestPermission } from '@/services/notifications';
import { radius, spacing } from '@/theme/tokens';

import { MonthCalendar } from './month-calendar';

type ScheduleType = Schedule['type'];

interface DraftException {
  key: string;
  kind: ExceptionKind;
  start: ISODate;
  end: ISODate;
}

interface FormState {
  kind: HabitKind;
  title: string;
  icon: string;
  goalId: string | null;
  // build
  trackingType: TrackingType;
  target: number;
  unit: string;
  minimumOn: boolean;
  minimum: number;
  minimumLabel: string;
  anchor: string;
  timeOfDay: TimeOfDay;
  // reduce
  reduceMode: ReduceMode;
  reduceUnit: string;
  baselineOn: boolean;
  baseline: number;
  limit: number;
  finalTarget: number;
  triggers: string[];
  // schedule
  scheduleType: ScheduleType;
  weekdays: number[];
  timesPerWeek: number;
  dates: ISODate[];
  reminderOn: boolean;
  reminderTime: string;
}

const ANCHORS = ['After my morning coffee', 'Before opening email', 'During my commute', 'After dinner', 'During my wind-down'];
const DEFAULT_REMINDER: Record<TimeOfDay, string> = { morning: '08:00', afternoon: '13:00', evening: '19:30', anytime: '09:00' };

function initialState(habit: Habit | undefined, kind: HabitKind, goalId: string | null): FormState {
  const base: FormState = {
    kind,
    title: '',
    icon: kind === 'reduce' ? 'do-not-disturb-on' : 'self-improvement',
    goalId,
    trackingType: 'duration',
    target: 10,
    unit: 'min',
    minimumOn: true,
    minimum: 2,
    minimumLabel: '',
    anchor: '',
    timeOfDay: 'morning',
    reduceMode: 'limit',
    reduceUnit: 'min',
    baselineOn: false,
    baseline: 60,
    limit: 30,
    finalTarget: 15,
    triggers: [],
    scheduleType: 'daily',
    weekdays: [0, 1, 2, 3, 4],
    timesPerWeek: 3,
    dates: [],
    reminderOn: false,
    reminderTime: '08:00',
  };
  if (!habit) return base;
  const v = currentVersion(habit);
  const s = v.schedule;
  return {
    ...base,
    kind: habit.kind,
    title: habit.title,
    icon: habit.icon,
    goalId: habit.goalId,
    trackingType: v.build?.trackingType ?? base.trackingType,
    target: v.build?.target ?? base.target,
    unit: v.build?.unit ?? base.unit,
    minimumOn: v.build ? v.build.minimum !== null : base.minimumOn,
    minimum: v.build?.minimum ?? base.minimum,
    minimumLabel: v.build?.minimumLabel ?? '',
    anchor: v.anchor ?? '',
    timeOfDay: v.timeOfDay,
    reduceMode: v.reduce?.mode ?? base.reduceMode,
    reduceUnit: v.reduce?.unit ?? base.reduceUnit,
    baselineOn: v.reduce ? v.reduce.baseline !== null : false,
    baseline: v.reduce?.baseline ?? base.baseline,
    limit: v.reduce?.limit ?? base.limit,
    finalTarget: v.reduce?.finalTarget ?? base.finalTarget,
    triggers: v.reduce?.triggers ?? [],
    scheduleType: s.type,
    weekdays: s.type === 'weekdays' ? s.weekdays : base.weekdays,
    timesPerWeek: s.type === 'flexWeekly' ? s.timesPerWeek : base.timesPerWeek,
    dates: s.type === 'dates' ? s.dates : [],
    reminderOn: !!v.reminderTime,
    reminderTime: v.reminderTime ?? DEFAULT_REMINDER[v.timeOfDay],
  };
}

function buildSchedule(f: FormState): Schedule {
  switch (f.scheduleType) {
    case 'daily':
      return { type: 'daily' };
    case 'weekdays':
      return { type: 'weekdays', weekdays: [...f.weekdays].sort() };
    case 'flexWeekly':
      return { type: 'flexWeekly', timesPerWeek: f.timesPerWeek };
    case 'dates':
      return { type: 'dates', dates: [...f.dates].sort() };
  }
}

function buildVersion(f: FormState, sensitive: boolean): Omit<HabitVersion, 'effectiveFrom'> {
  const check = f.trackingType === 'check';
  return {
    schedule: buildSchedule(f),
    build:
      f.kind === 'build'
        ? {
            trackingType: f.trackingType,
            target: check ? 1 : Math.max(1, f.target),
            unit: check ? 'time' : f.trackingType === 'duration' ? 'min' : f.unit.trim() || 'times',
            minimum: !check && f.minimumOn ? Math.min(f.minimum, Math.max(1, f.target)) : null,
            minimumLabel: !check && f.minimumOn && f.minimumLabel.trim() ? f.minimumLabel.trim() : null,
          }
        : null,
    reduce:
      f.kind === 'reduce'
        ? {
            mode: f.reduceMode,
            unit: f.reduceUnit.trim() || 'times',
            baseline: f.baselineOn || f.reduceMode === 'taper' ? f.baseline : null,
            limit: f.reduceMode === 'avoid' ? 0 : f.limit,
            finalTarget: f.reduceMode === 'taper' ? Math.min(f.finalTarget, f.limit) : null,
            triggers: f.triggers,
            sensitive,
          }
        : null,
    timeOfDay: f.timeOfDay,
    reminderTime: f.reminderOn ? f.reminderTime : null,
    anchor: f.kind === 'build' && f.anchor.trim() ? f.anchor.trim() : null,
  };
}

function validateDetails(f: FormState): string | null {
  if (!f.title.trim()) return f.kind === 'build' ? 'Give your habit a name.' : 'Describe the behaviour you want to change.';
  if (f.kind === 'reduce' && f.reduceMode === 'taper' && f.finalTarget >= f.baseline)
    return 'For gradual reduction, the target should be below where you are now.';
  return null;
}

function validateSchedule(f: FormState): string | null {
  if (f.scheduleType === 'weekdays' && f.weekdays.length === 0) return 'Choose at least one day.';
  if (f.scheduleType === 'dates' && f.dates.length === 0) return 'Choose at least one date.';
  return null;
}

export interface HabitFormProps {
  habit?: Habit;
  kind?: HabitKind;
  commitmentId?: string | null;
  goalId?: string | null;
  onboarding?: boolean;
}

export function HabitForm({ habit, kind = 'build', commitmentId = null, goalId = null, onboarding }: HabitFormProps) {
  const editing = !!habit;
  const today = useToday();
  const c = useColors();
  const linkedCommitmentId = habit?.commitmentId ?? commitmentId;
  const commitment = useCommitment(linkedCommitmentId ?? undefined);
  const goals = useStore((s) => s.data.goals);
  const settings = useStore((s) => s.data.settings);
  const allExceptions = useStore((s) => s.data.exceptions);
  const existingExceptions = useMemo(
    () => (habit ? allExceptions.filter((e) => e.habitId === habit.id) : []),
    [allExceptions, habit],
  );

  const [f, setF] = useState<FormState>(() => initialState(habit, kind, goalId ?? commitment?.goalId ?? null));
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [customTrigger, setCustomTrigger] = useState('');
  const [drafts, setDrafts] = useState<DraftException[]>([]);
  const [exceptionSheet, setExceptionSheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(false);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [month, setMonth] = useState(today);
  const set = (patch: Partial<FormState>) => {
    setError(null);
    setF((prev) => ({ ...prev, ...patch }));
  };

  const sensitive = f.kind === 'reduce' && isSensitiveBehavior(f.title);
  const alcohol = f.kind === 'reduce' && isAlcohol(f.title);
  const needsSafety = sensitive && !habit?.safetyAcknowledged;
  const totalSteps = needsSafety ? 3 : 2;
  const goal = goals.find((g) => g.id === f.goalId);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const commitmentLocked = !!linkedCommitmentId;

  const startDate: ISODate = commitment
    ? commitment.status === 'draft'
      ? commitment.startDate
      : maxDate(today, commitment.startDate)
    : today;

  const schedule = buildSchedule(f);
  const exceptionsShown = editing
    ? existingExceptions.map((e) => ({ key: e.id, kind: e.kind, start: e.start, end: e.end }))
    : drafts;
  const isException = (d: ISODate) => exceptionsShown.some((e) => d >= e.start && d <= e.end);

  // ---- Reminders ----
  const toggleReminder = async (on: boolean) => {
    set({ reminderOn: on, reminderTime: on && !f.reminderOn ? DEFAULT_REMINDER[f.timeOfDay] : f.reminderTime });
    setReminderNote(null);
    if (on && !settings.remindersEnabled) {
      const granted = await requestPermission();
      if (granted) updateSettings({ remindersEnabled: true });
      else
        setReminderNote(
          "Notifications aren't allowed for LifeOS right now. The time is saved and will be used if you allow notifications later.",
        );
    }
  };

  // ---- Save ----
  const save = async (acknowledged: boolean) => {
    const version = buildVersion(f, sensitive);
    if (editing && habit) {
      const before = currentVersion(habit);
      const { effectiveFrom: _e, ...prev } = before;
      const changed = JSON.stringify(prev) !== JSON.stringify(version);
      updateHabit(
        habit.id,
        {
          title: f.title.trim(),
          icon: f.icon,
          goalId: commitmentLocked ? habit.goalId : f.goalId,
          safetyAcknowledged: habit.safetyAcknowledged || acknowledged,
        },
        changed ? version : undefined,
      );
      goBack(`/habit/${habit.id}`);
      return;
    }
    const id = createHabit({
      kind: f.kind,
      title: f.title.trim(),
      icon: f.icon,
      goalId: f.goalId,
      commitmentId: linkedCommitmentId,
      startDate,
      version,
      safetyAcknowledged: acknowledged,
    });
    for (const e of drafts) addException({ habitId: id, commitmentId: null, start: e.start, end: e.end, kind: e.kind });
    if (linkedCommitmentId) {
      goBack(`/commitment/${linkedCommitmentId}/plan`);
    } else if (onboarding) {
      await completeOnboarding();
      router.replace('/today');
    } else {
      router.replace(`/habit/${id}`);
    }
  };

  const next = () => {
    if (step === 1) {
      const err = validateDetails(f);
      if (err) return setError(err);
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateSchedule(f);
      if (err) return setError(err);
      if (needsSafety) return setStep(3);
      save(false);
    }
  };

  const back = () => (step > 1 ? setStep(step - 1) : goBack());

  const footer =
    step === 3 ? (
      <>
        <Button title={SAFETY.acknowledge} icon="check" onPress={() => save(true)} testID="safety-ack" />
        <Button title="Back" variant="ghost" onPress={() => setStep(2)} />
      </>
    ) : (
      <>
        {error ? (
          <Text variant="bodySm" tone="error" center accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          title={step === 2 && !needsSafety ? (editing ? 'Save changes' : 'Save habit') : 'Continue'}
          iconRight={step === 2 && !needsSafety ? 'check' : 'arrow-forward'}
          onPress={next}
          testID="habit-form-continue"
        />
      </>
    );

  return (
    <Screen title={editing ? 'Edit habit' : 'New habit'} back={back} avatar footer={footer}>
      <StepHeader step={step} total={totalSteps} label={step === 1 ? 'Details' : step === 2 ? 'Schedule' : 'Support'} />

      {step === 1 && (
        <Stack gap={spacing.lg}>
          <PageTitle
            title={f.kind === 'build' ? 'Design your practice.' : 'Change a pattern, gently.'}
            subtitle={
              f.kind === 'build'
                ? 'Habits that start small and attach to an existing routine are easier to keep.'
                : 'Notice the behaviour and choose a pace that feels realistic.'
            }
          />
          {!editing ? (
            <SegmentedControl
              options={[
                { value: 'build', label: 'Build a habit', icon: 'add-circle-outline' },
                { value: 'reduce', label: 'Reduce a habit', icon: 'remove-circle-outline' },
              ]}
              value={f.kind}
              onChange={(k) =>
                set({ kind: k as HabitKind, icon: k === 'reduce' ? 'do-not-disturb-on' : 'self-improvement' })
              }
            />
          ) : null}

          {/* Linked commitment / goal */}
          {commitment ? (
            <Card>
              <Row gap={spacing.md}>
                <Icon name="link" color={c.primaryText} />
                <View style={{ flex: 1 }}>
                  <Text variant="labelSm" tone="tertiary" uppercase>
                    Linked commitment
                  </Text>
                  <Text variant="bodyMd">{commitment.title}</Text>
                </View>
              </Row>
            </Card>
          ) : (
            <Card onPress={() => setGoalSheet(true)} accessibilityLabel="Link to a goal">
              <Row gap={spacing.md}>
                <Icon name="flag" color={goal ? c.primaryText : c.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text variant="labelSm" tone="tertiary" uppercase>
                    Linked goal
                  </Text>
                  <Text variant="bodyMd" tone={goal ? 'primary' : 'secondary'}>
                    {goal ? goal.title : 'Standalone habit (optional goal)'}
                  </Text>
                </View>
                <Icon name="edit" size={18} />
              </Row>
            </Card>
          )}

          <Field label={f.kind === 'build' ? 'Habit name' : 'Behaviour to reduce'}>
            <TextField
              value={f.title}
              onChangeText={(t) => {
                const patch: Partial<FormState> = { title: t };
                // Alcohol: never preselect "avoid entirely" (plan §5).
                if (f.kind === 'reduce' && isAlcohol(t) && f.reduceMode === 'avoid' && !editing) patch.reduceMode = 'taper';
                if (f.kind === 'reduce' && isAlcohol(t) && !isAlcohol(f.title) && !editing) patch.reduceMode = 'taper';
                set(patch);
              }}
              placeholder={f.kind === 'build' ? 'e.g. Practice English speaking' : 'e.g. Social media scrolling'}
              maxLength={60}
              accessibilityLabel={f.kind === 'build' ? 'Habit name' : 'Behaviour to reduce'}
              testID="habit-title"
            />
          </Field>

          <Field label="Icon">
            <View style={styles.iconGrid}>
              {HABIT_ICONS.map((name) => {
                const on = f.icon === name;
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Icon ${name.replace(/-/g, ' ')}`}
                    onPress={() => set({ icon: name })}
                    style={[styles.iconCell, { backgroundColor: on ? c.primary : c.inset }]}>
                    <Icon name={name} size={22} color={on ? c.onPrimary : c.textSecondary} />
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {f.kind === 'build' ? (
            <BuildFields f={f} set={set} />
          ) : (
            <ReduceFields
              f={f}
              set={set}
              alcohol={alcohol}
              customTrigger={customTrigger}
              setCustomTrigger={setCustomTrigger}
            />
          )}

          <Field label="Preferred time of day">
            <ChipGroup
              options={TIME_OF_DAY.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
              value={f.timeOfDay}
              onChange={(v) => set({ timeOfDay: v as TimeOfDay })}
            />
          </Field>

          <Banner
            icon="verified-user"
            title="Quiet tracking"
            body="No streak resets or alarms. You can adjust targets, schedule and the minimum version at any time."
          />
        </Stack>
      )}

      {step === 2 && (
        <Stack gap={spacing.lg}>
          <PageTitle title="Make it fit your life." subtitle="Choose a rhythm that leaves room for busy days, travel and rest." />
          <Card inset>
            <Row gap={spacing.md}>
              <Icon name={f.icon} color={c.primaryText} />
              <View style={{ flex: 1 }}>
                <Text variant="labelLg" numberOfLines={1}>
                  {f.title}
                </Text>
                <Text variant="bodySm" tone="secondary">
                  {summaryLine(f)}
                </Text>
              </View>
            </Row>
          </Card>

          <SectionHeader title="Rhythm" />
          <Stack gap={spacing.sm}>
            {(
              [
                { value: 'daily', title: 'Every day', description: 'A small daily practice.', icon: 'all-inclusive' },
                { value: 'weekdays', title: 'Specific weekdays', description: 'For example, workdays with weekends off.', icon: 'calendar-view-week' },
                { value: 'flexWeekly', title: 'Flexible target', description: 'A number of times per week, any day.', icon: 'tune' },
                { value: 'dates', title: 'Exact dates', description: 'Pick the days on a calendar.', icon: 'event' },
              ] as const
            ).map((o) => (
              <SelectableCard
                key={o.value}
                title={o.title}
                description={o.description}
                icon={o.icon}
                selected={f.scheduleType === o.value}
                onPress={() => set({ scheduleType: o.value })}
              />
            ))}
          </Stack>

          {f.scheduleType === 'weekdays' ? (
            <Card>
              <Stack gap={spacing.md}>
                <Row justify="space-between">
                  <Text variant="labelLg">Days</Text>
                  <Text variant="labelMd" tone="sage">
                    {f.weekdays.length} active · {7 - f.weekdays.length} rest
                  </Text>
                </Row>
                <WeekdayPicker value={f.weekdays} onChange={(v) => set({ weekdays: v })} />
              </Stack>
            </Card>
          ) : null}

          {f.scheduleType === 'flexWeekly' ? (
            <Card>
              <Stack gap={spacing.md}>
                <Text variant="labelLg">Times per week</Text>
                <Stepper value={f.timesPerWeek} onChange={(v) => set({ timesPerWeek: v })} min={1} max={7} unit="× / week" />
                <Text variant="bodySm" tone="secondary">
                  Progress is shown toward the weekly target. Sessions are never counted as missed before the week ends.
                </Text>
              </Stack>
            </Card>
          ) : null}

          <Card>
            <Stack gap={spacing.md}>
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                today={today}
                onDayPress={
                  f.scheduleType === 'dates'
                    ? (d) => {
                        if (d < startDate) return;
                        set({ dates: f.dates.includes(d) ? f.dates.filter((x) => x !== d) : [...f.dates, d] });
                      }
                    : undefined
                }
                cell={(d) => {
                  if (d < startDate) return { fg: c.textTertiary };
                  if (isException(d)) return { bg: c.amberSoft, fg: c.amber, label: 'Planned exception' };
                  if (f.scheduleType === 'flexWeekly') return { dot: c.primary, label: 'Available' };
                  if (scheduleMatches(schedule, d)) return { bg: c.primarySoft, fg: c.primaryText, label: 'Scheduled' };
                  return {};
                }}
              />
              {f.scheduleType === 'dates' ? (
                <Text variant="bodySm" tone="secondary">
                  Tap days to add or remove them. {f.dates.length} selected.
                </Text>
              ) : null}
              <Row justify="space-between">
                <Text variant="labelSm" tone="secondary" uppercase>
                  Planned exceptions
                </Text>
                <Button title="Add exception" icon="add" variant="ghost" size="sm" onPress={() => setExceptionSheet(true)} />
              </Row>
              {exceptionsShown.length === 0 ? (
                <Text variant="bodySm" tone="tertiary">
                  Add travel, holidays or rest days you already know about.
                </Text>
              ) : (
                <Row wrap gap={spacing.sm}>
                  {exceptionsShown.map((e) => {
                    const k = EXCEPTION_KINDS.find((x) => x.value === e.kind);
                    return (
                      <Pressable
                        key={e.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${k?.label} ${formatRange(e.start, e.end)}`}
                        onPress={() =>
                          editing ? removeException(e.key) : setDrafts((ds) => ds.filter((x) => x.key !== e.key))
                        }
                        style={[styles.exChip, { backgroundColor: c.amberSoft }]}>
                        <Icon name={k?.icon ?? 'event'} size={16} color={c.amber} />
                        <Text variant="labelMd" color={c.amber}>
                          {k?.label}: {formatRange(e.start, e.end)}
                        </Text>
                        <Icon name="close" size={16} color={c.amber} />
                      </Pressable>
                    );
                  })}
                </Row>
              )}
            </Stack>
          </Card>

          <Banner
            icon="spa"
            title="Planned rest is not a missed day."
            body="Exceptions, rest days and pauses are never counted against your consistency."
          />

          <Group>
            <ToggleRow
              title="Gentle reminder"
              subtitle={f.reminderOn ? `Scheduled for ${formatTime(f.reminderTime)} on planned days` : 'Off'}
              icon="notifications-none"
              value={f.reminderOn}
              onChange={toggleReminder}
            />
            {f.reminderOn ? (
              <View style={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}>
                <TimePicker value={f.reminderTime} onChange={(t) => set({ reminderTime: t })} />
                {settings.quietHoursEnabled ? (
                  <Text variant="bodySm" tone="tertiary">
                    Quiet hours ({formatTime(settings.quietStart)} – {formatTime(settings.quietEnd)}) are respected.
                  </Text>
                ) : null}
                {reminderNote ? (
                  <Text variant="bodySm" tone="secondary">
                    {reminderNote}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Group>

          {editing ? (
            <Banner icon="history" body="Changes apply from today. Your history stays as it was." />
          ) : (
            <Text variant="bodySm" tone="tertiary" center>
              You can reschedule, pause or adjust this habit any time without losing your history.
            </Text>
          )}
        </Stack>
      )}

      {step === 3 && (
        <Stack gap={spacing.lg}>
          <PageTitle eyebrow="Support" title={SAFETY.title} />
          <Card>
            <Stack gap={spacing.md}>
              <Text variant="bodyMd">{SAFETY.intro}</Text>
              {alcohol ? (
                <Banner icon="health-and-safety" tone="amber" body={SAFETY.alcohol} />
              ) : null}
              <Text variant="bodyMd" tone="secondary">
                {SAFETY.support(f.title.trim().toLowerCase())}
              </Text>
              <Text variant="bodyMd" tone="secondary">
                {SAFETY.crisis}
              </Text>
            </Stack>
          </Card>
          <Text variant="bodySm" tone="tertiary" center>
            You can read this again any time from the habit's details.
          </Text>
        </Stack>
      )}

      <ExceptionSheet
        visible={exceptionSheet}
        onClose={() => setExceptionSheet(false)}
        startDate={startDate}
        today={today}
        onAdd={(e) => {
          if (editing && habit) addException({ habitId: habit.id, commitmentId: null, start: e.start, end: e.end, kind: e.kind });
          else setDrafts((ds) => [...ds, { ...e, key: `${e.start}-${e.end}-${ds.length}` }]);
          setExceptionSheet(false);
        }}
      />

      <Sheet visible={goalSheet} onClose={() => setGoalSheet(false)} title="Link to a goal">
        <SelectableCard
          title="No goal"
          description="Keep this as a standalone habit."
          icon="radio-button-unchecked"
          selected={!f.goalId}
          onPress={() => {
            set({ goalId: null });
            setGoalSheet(false);
          }}
        />
        {activeGoals.map((g) => (
          <SelectableCard
            key={g.id}
            title={g.title}
            icon="flag"
            selected={f.goalId === g.id}
            onPress={() => {
              set({ goalId: g.id });
              setGoalSheet(false);
            }}
          />
        ))}
        {activeGoals.length === 0 ? (
          <Text variant="bodySm" tone="tertiary">
            You haven't created any goals yet. Habits work on their own too.
          </Text>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function summaryLine(f: FormState): string {
  if (f.kind === 'build') {
    if (f.trackingType === 'check') return 'Check off when done';
    return `${f.target} ${f.trackingType === 'duration' ? 'min' : f.unit || 'times'}${f.minimumOn ? ` · minimum ${f.minimum}` : ''}`;
  }
  const mode = REDUCE_MODES.find((m) => m.value === f.reduceMode)?.label ?? '';
  return f.reduceMode === 'avoid' ? mode : `${mode} · ${f.limit} ${f.reduceUnit}`;
}

function BuildFields({ f, set }: { f: FormState; set: (p: Partial<FormState>) => void }) {
  const c = useColors();
  const presets = [5, 10, 15, 30];
  return (
    <>
      <Field label="How will you track it?">
        <SegmentedControl
          options={[
            { value: 'check', label: 'Check' },
            { value: 'duration', label: 'Minutes' },
            { value: 'quantity', label: 'Amount' },
          ]}
          value={f.trackingType}
          onChange={(t) => set({ trackingType: t as TrackingType, target: t === 'duration' ? 10 : t === 'quantity' ? 5 : 1, minimum: t === 'quantity' ? 1 : 2 })}
        />
      </Field>

      {f.trackingType !== 'check' ? (
        <Card>
          <Stack gap={spacing.md}>
            <Row justify="space-between">
              <Text variant="labelLg">{f.trackingType === 'duration' ? 'Target duration' : 'Target amount'}</Text>
              <Text variant="headlineSm" tone="accent" tabular>
                {f.target} {f.trackingType === 'duration' ? 'min' : f.unit || 'times'}
              </Text>
            </Row>
            {f.trackingType === 'duration' ? (
              <View style={styles.presetRow}>
                {presets.map((p) => (
                  <Pressable
                    key={p}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: f.target === p }}
                    accessibilityLabel={`${p} minutes`}
                    onPress={() => set({ target: p, minimum: Math.min(f.minimum, p) })}
                    style={[styles.preset, { backgroundColor: f.target === p ? c.primary : c.inset }]}>
                    <Text variant="labelLg" color={f.target === p ? c.onPrimary : c.text}>
                      {p} min
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <TextField
                value={f.unit}
                onChangeText={(t) => set({ unit: t })}
                placeholder="Unit, e.g. pages, words, glasses"
                maxLength={16}
                accessibilityLabel="Unit"
              />
            )}
            <Stepper
              value={f.target}
              onChange={(v) => set({ target: v, minimum: Math.min(f.minimum, v) })}
              min={1}
              max={f.trackingType === 'duration' ? 480 : 999}
              step={f.trackingType === 'duration' && f.target >= 30 ? 5 : 1}
              unit={f.trackingType === 'duration' ? 'min' : f.unit || 'times'}
            />
            <View style={[styles.minBox, { backgroundColor: c.inset }]}>
              <ToggleRow
                title="Minimum version"
                subtitle="For low-energy days: show up with a smaller step."
                icon="eco"
                value={f.minimumOn}
                onChange={(v) => set({ minimumOn: v })}
              />
              {f.minimumOn ? (
                <View style={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                  <Stepper
                    value={f.minimum}
                    onChange={(v) => set({ minimum: v })}
                    min={1}
                    max={Math.max(1, f.target)}
                    unit={f.trackingType === 'duration' ? 'min' : f.unit || 'times'}
                  />
                  <TextField
                    value={f.minimumLabel}
                    onChangeText={(t) => set({ minimumLabel: t })}
                    placeholder="Optional description, e.g. a 2-minute voice note"
                    maxLength={60}
                    accessibilityLabel="Minimum version description"
                  />
                </View>
              ) : null}
            </View>
          </Stack>
        </Card>
      ) : null}

      <Field label="Habit anchor" optional hint="When or after which existing routine will you practise?">
        <TextField
          value={f.anchor}
          onChangeText={(t) => set({ anchor: t })}
          placeholder="e.g. After my morning coffee"
          maxLength={60}
          accessibilityLabel="Habit anchor"
        />
        <Row wrap gap={spacing.sm}>
          {ANCHORS.map((a) => (
            <Chip key={a} label={`+ ${a}`} small selected={f.anchor === a} onPress={() => set({ anchor: a })} />
          ))}
        </Row>
      </Field>
    </>
  );
}

function ReduceFields({
  f,
  set,
  alcohol,
  customTrigger,
  setCustomTrigger,
}: {
  f: FormState;
  set: (p: Partial<FormState>) => void;
  alcohol: boolean;
  customTrigger: string;
  setCustomTrigger: (t: string) => void;
}) {
  const triggerOptions = Array.from(new Set([...DEFAULT_TRIGGERS, ...f.triggers]));
  const unitLabel = f.reduceUnit || 'times';
  return (
    <>
      <Field label="Approach">
        <Stack gap={spacing.sm}>
          {REDUCE_MODES.map((m) => (
            <SelectableCard
              key={m.value}
              title={m.label}
              description={m.description}
              selected={f.reduceMode === m.value}
              onPress={() => set({ reduceMode: m.value })}
            />
          ))}
        </Stack>
        {alcohol ? (
          <Banner
            icon="health-and-safety"
            tone="amber"
            body="For alcohol, reducing gradually with support from a doctor or pharmacist is the safer path. You'll see more on the last step."
          />
        ) : null}
      </Field>

      <Field label="Measured in">
        <ChipGroup
          options={[
            { value: 'min', label: 'Minutes' },
            { value: 'times', label: 'Times' },
            ...(f.reduceUnit !== 'min' && f.reduceUnit !== 'times' ? [{ value: f.reduceUnit, label: f.reduceUnit }] : []),
          ]}
          value={f.reduceUnit}
          onChange={(v) => set({ reduceUnit: v as string })}
        />
        <TextField
          value={f.reduceUnit === 'min' || f.reduceUnit === 'times' ? '' : f.reduceUnit}
          onChangeText={(t) => set({ reduceUnit: t || 'times' })}
          placeholder="Or a custom unit, e.g. drinks, cigarettes, checks"
          maxLength={16}
          accessibilityLabel="Custom unit"
        />
      </Field>

      {f.reduceMode !== 'taper' ? (
        <Card>
          <Stack gap={spacing.sm}>
            <ToggleRow
              title="Record a baseline"
              subtitle="Roughly how much per day right now? Useful for seeing trends."
              value={f.baselineOn}
              onChange={(v) => set({ baselineOn: v })}
            />
            {f.baselineOn ? <Stepper value={f.baseline} onChange={(v) => set({ baseline: v })} min={0} unit={unitLabel} step={f.reduceUnit === 'min' ? 5 : 1} /> : null}
          </Stack>
        </Card>
      ) : (
        <Card>
          <Stack gap={spacing.md}>
            <Text variant="labelLg">Where you are now (per day)</Text>
            <Stepper value={f.baseline} onChange={(v) => set({ baseline: v, limit: Math.min(f.limit, v) })} min={1} unit={unitLabel} step={f.reduceUnit === 'min' ? 5 : 1} />
            <Text variant="labelLg">Where you'd like to get to</Text>
            <Stepper value={f.finalTarget} onChange={(v) => set({ finalTarget: v })} min={0} max={Math.max(0, f.baseline - 1)} unit={unitLabel} step={f.reduceUnit === 'min' ? 5 : 1} />
            <Text variant="labelLg">Limit for now</Text>
            <Stepper value={f.limit} onChange={(v) => set({ limit: v })} min={f.finalTarget} max={f.baseline} unit={unitLabel} step={f.reduceUnit === 'min' ? 5 : 1} />
            <Text variant="bodySm" tone="secondary">
              You decide when to step down. LifeOS may suggest a next step, and nothing changes unless you confirm it.
            </Text>
          </Stack>
        </Card>
      )}

      {f.reduceMode === 'limit' ? (
        <Field label="Daily limit">
          <Stepper value={f.limit} onChange={(v) => set({ limit: v })} min={0} unit={unitLabel} step={f.reduceUnit === 'min' ? 5 : 1} />
        </Field>
      ) : null}

      <Field label="Common triggers" optional hint="Noticing what invites the behaviour can make it easier to plan for.">
        <ChipGroup
          multiple
          small
          options={triggerOptions.map((t) => ({ value: t, label: t }))}
          value={f.triggers}
          onChange={(v) => set({ triggers: v as string[] })}
        />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <TextField
              value={customTrigger}
              onChangeText={setCustomTrigger}
              placeholder="Add your own"
              maxLength={30}
              accessibilityLabel="Custom trigger"
            />
          </View>
          <Button
            title="Add"
            variant="secondary"
            disabled={!customTrigger.trim()}
            onPress={() => {
              const t = customTrigger.trim();
              if (t && !f.triggers.includes(t)) set({ triggers: [...f.triggers, t] });
              setCustomTrigger('');
            }}
          />
        </Row>
      </Field>
    </>
  );
}

function ExceptionSheet({
  visible,
  onClose,
  onAdd,
  startDate,
  today,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (e: { kind: ExceptionKind; start: ISODate; end: ISODate }) => void;
  startDate: ISODate;
  today: ISODate;
}) {
  const c = useColors();
  const [kind, setKind] = useState<ExceptionKind>('rest');
  const [start, setStart] = useState<ISODate | null>(null);
  const [end, setEnd] = useState<ISODate | null>(null);
  const [month, setMonth] = useState(startDate > today ? startDate : today);
  const min = startDate > today ? startDate : today;

  const reset = () => {
    setStart(null);
    setEnd(null);
    setKind('rest');
  };
  const range = useMemo(() => (start ? { start, end: end ?? start } : null), [start, end]);

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a planned exception">
      <ChipGroup
        options={EXCEPTION_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon }))}
        value={kind}
        onChange={(v) => setKind(v as ExceptionKind)}
      />
      <Text variant="bodySm" tone="secondary">
        Tap a day, then tap another day for a range.
      </Text>
      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        today={today}
        onDayPress={(d) => {
          if (d < min) return;
          if (!start || (start && end) || d < start) {
            setStart(d);
            setEnd(null);
          } else setEnd(d);
        }}
        cell={(d) => {
          if (d < min) return { fg: c.textTertiary };
          if (range && d >= range.start && d <= range.end) return { bg: c.primary, fg: c.onPrimary, label: 'Selected' };
          return {};
        }}
      />
      {range ? <Pill label={formatRange(range.start, range.end)} tone="primary" icon="event" /> : null}
      <Button
        title="Add exception"
        icon="add"
        disabled={!range}
        onPress={() => {
          if (!range) return;
          onAdd({ kind, ...range });
          reset();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconCell: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  presetRow: { flexDirection: 'row', gap: spacing.sm },
  preset: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  minBox: { borderRadius: radius.md, overflow: 'hidden' },
  exChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 36, borderRadius: radius.sm },
});
