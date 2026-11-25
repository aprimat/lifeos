import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ChipGroup, TextField } from '@/components/controls';
import { Field } from '@/components/layout';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { addStep, deleteStep, updateStep } from '@/data/actions';
import { addDays, formatShortDay } from '@/domain/dates';
import type { ID, ISODate, Step } from '@/domain/types';
import { useData, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';

import { MonthCalendar } from '../habits/month-calendar';

type When = 'none' | 'today' | 'tomorrow' | 'pick';

/**
 * Add or edit a one-off step. With `step` it edits (and offers time spent, "Make this a habit",
 * delete). Without `goalId` (from the + button) it first asks which goal it's for.
 */
export function StepSheet({
  visible,
  onClose,
  step,
  goalId,
  defaultDate = null,
}: {
  visible: boolean;
  onClose: () => void;
  step?: Step | null;
  goalId?: ID | null;
  defaultDate?: ISODate | null;
}) {
  // Remount the form each time it opens so it starts from the step (or blank).
  return (
    <Sheet visible={visible} onClose={onClose} title={step ? 'Edit step' : 'New step'}>
      {visible ? <StepForm key={step?.id ?? 'new'} onClose={onClose} step={step ?? null} goalId={goalId ?? null} defaultDate={defaultDate} /> : null}
    </Sheet>
  );
}

function StepForm({ onClose, step, goalId, defaultDate }: { onClose: () => void; step: Step | null; goalId: ID | null; defaultDate: ISODate | null }) {
  const c = useColors();
  const today = useToday();
  const goals = useData().goals.filter((g) => g.status === 'active');
  const initialDate = step ? step.date : defaultDate;
  const [title, setTitle] = useState(step?.title ?? '');
  const [goal, setGoal] = useState<ID | null>(step?.goalId ?? goalId ?? (goals.length === 1 ? goals[0].id : null));
  const [date, setDate] = useState<ISODate | null>(initialDate);
  const [picking, setPicking] = useState(false);
  const [month, setMonth] = useState(initialDate ?? today);
  const [minutes, setMinutes] = useState(step?.minutes ? String(step.minutes) : '');

  const when: When = date === null ? 'none' : date === today ? 'today' : date === addDays(today, 1) ? 'tomorrow' : 'pick';
  const askGoal = !step && !goalId;
  const canSave = !!title.trim() && !!goal;

  const save = () => {
    if (!canSave || !goal) return;
    const mins = minutes.trim() ? Math.max(0, Math.round(Number(minutes))) : null;
    if (step) updateStep(step.id, { title, date, minutes: Number.isFinite(mins) ? mins : null });
    else addStep({ goalId: goal, title, date });
    onClose();
  };

  if (askGoal && goals.length === 0) {
    return (
      <>
        <Text variant="bodyMd" tone="secondary">
          A step belongs to a goal. Add a goal first, then its steps.
        </Text>
        <Button
          title="Add a goal"
          icon="flag"
          onPress={() => {
            onClose();
            router.push('/goal/new');
          }}
        />
      </>
    );
  }

  return (
    <>
      <Text variant="bodyMd" tone="secondary">
        A one-off action toward a goal, e.g. “Update my CV”. Something you repeat works better as a habit.
      </Text>
      {askGoal ? (
        <Field label="For which goal?">
          <ChipGroup options={goals.map((g) => ({ value: g.id, label: g.title, icon: 'flag' }))} value={goal} onChange={(v) => setGoal(v as ID)} />
        </Field>
      ) : null}
      <Field label="Step">
        <TextField value={title} onChangeText={setTitle} maxLength={100} placeholder="e.g. Visit two companies" accessibilityLabel="Step" autoFocus={!step} />
      </Field>
      <Field label="When" optional>
        <ChipGroup<When>
          options={[
            { value: 'none', label: 'No date' },
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'pick', label: when === 'pick' && date ? formatShortDay(date) : 'Pick a day' },
          ]}
          value={when}
          onChange={(v) => {
            const w = v as When;
            setPicking(w === 'pick');
            if (w === 'none') setDate(null);
            else if (w === 'today') setDate(today);
            else if (w === 'tomorrow') setDate(addDays(today, 1));
          }}
        />
      </Field>
      {picking ? (
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          today={today}
          cell={(d) => (d === date ? { bg: c.primary, fg: c.onPrimary, label: 'chosen' } : {})}
          onDayPress={(d) => {
            setDate(d);
            setPicking(false);
          }}
        />
      ) : null}
      {step ? (
        <Field label="Time spent" optional hint="Minutes, if you'd like to count them toward the goal.">
          <TextField value={minutes} onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} placeholder="e.g. 45" accessibilityLabel="Time spent in minutes" />
        </Field>
      ) : null}
      <Button title="Save" disabled={!canSave} onPress={save} />
      {step ? (
        <>
          <Button
            title="Make this a habit"
            variant="secondary"
            icon="repeat"
            onPress={() => {
              onClose();
              router.push(`/habit/new?goalId=${step.goalId}&title=${encodeURIComponent(step.title)}&fromStep=${step.id}`);
            }}
          />
          <Button
            title="Delete step"
            variant="ghost"
            icon="delete-outline"
            onPress={() => {
              deleteStep(step.id);
              onClose();
            }}
          />
        </>
      ) : null}
    </>
  );
}
