import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ChipGroup, Stepper, TextField, ToggleRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Field, PageTitle, SectionHeader, StepHeader } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { EXCEPTION_KINDS } from '@/copy';
import { addException, addMilestone, deleteHabit, deleteMilestone, removeException, updateCommitment } from '@/data/actions';
import { addDays, diffDays, formatRange, todayISO } from '@/domain/dates';
import { commitmentEndDate } from '@/domain/schedule';
import type { ExceptionKind } from '@/domain/types';
import { useCommitment, useData } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow } from '../goals/shared';
import { DurationPicker, durationLabel, nextMonday, startDateLabel } from './shared';

export function CommitmentPlan() {
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string }>();
  const c = useColors();
  const commitment = useCommitment(id);
  const data = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [msOpen, setMsOpen] = useState(false);

  // edit sheet state
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number | null>(30);
  const [start, setStart] = useState(todayISO());
  // exception sheet state
  const [exKind, setExKind] = useState<ExceptionKind>('rest');
  const [exOffset, setExOffset] = useState(0);
  const [exLength, setExLength] = useState(1);
  // milestone sheet state
  const [msTitle, setMsTitle] = useState('');
  const [msUseSessions, setMsUseSessions] = useState(false);
  const [msSessions, setMsSessions] = useState(10);

  if (!commitment) {
    return (
      <Screen title="Plan" back>
        <EmptyState icon="timer" title="Commitment not found" body="It may have been discarded." />
      </Screen>
    );
  }

  const ob = onboarding === '1' ? '?onboarding=1' : '';
  const habits = data.habits.filter((h) => h.commitmentId === commitment.id);
  const exceptions = data.exceptions.filter((e) => e.commitmentId === commitment.id);
  const milestones = data.milestones.filter((m) => m.ownerType === 'commitment' && m.ownerId === commitment.id);
  const end = commitmentEndDate(commitment);
  const isDraft = commitment.status === 'draft';
  const maxOffset = commitment.durationDays ? commitment.durationDays - 1 : 180;
  const exStart = addDays(commitment.startDate, exOffset);
  const exEnd = addDays(exStart, exLength - 1);
  const today = todayISO();

  const openEdit = () => {
    setTitle(commitment.title);
    setDuration(commitment.durationDays);
    setStart(commitment.startDate);
    setEditOpen(true);
  };

  const addHabit = () =>
    router.push(`/habit/new?commitmentId=${commitment.id}${commitment.goalId ? `&goalId=${commitment.goalId}` : ''}`);

  return (
    <Screen
      title="Plan your commitment"
      back={() => goBack('/goals')}
      footer={
        isDraft ? (
          <Button
            title="Review plan"
            iconRight="arrow-forward"
            disabled={habits.length === 0}
            onPress={() => router.push(`/commitment/${commitment.id}/review${ob}`)}
          />
        ) : (
          <Button title="Done" onPress={() => goBack(`/commitment/${commitment.id}`)} />
        )
      }>
      {isDraft ? <StepHeader step={2} total={3} label="Habits & rhythm" /> : null}
      <PageTitle title="Choose your habits." subtitle="Start small. A few repeatable actions are enough." />

      <Card>
        <Row justify="space-between" align="flex-start">
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headlineSm">{commitment.title}</Text>
            <Text variant="bodySm" tone="secondary">
              {durationLabel(commitment.durationDays)} · {end ? formatRange(commitment.startDate, end) : `from ${startDateLabel(commitment.startDate)}`}
            </Text>
          </View>
          <Button title="Edit" size="sm" variant="secondary" icon="edit" onPress={openEdit} />
        </Row>
      </Card>

      <SectionHeader title="Habits" right={`${habits.length}`} />
      {habits.length === 0 ? (
        <Banner icon="repeat" body="Add at least one habit. You can combine habits to build and behaviours to reduce." />
      ) : (
        <Stack>
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              onPress={() => router.push(`/habit/${h.id}/edit`)}
              right={
                isDraft ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${h.title}`}
                    hitSlop={8}
                    onPress={() => deleteHabit(h.id)}
                    style={{ padding: spacing.sm }}>
                    <Icon name="close" size={20} color={c.textTertiary} />
                  </Pressable>
                ) : (
                  <Icon name="chevron-right" />
                )
              }
            />
          ))}
        </Stack>
      )}
      <Button title="Add habit" variant="secondary" icon="add" onPress={addHabit} />

      <SectionHeader title="Planned exceptions" right={exceptions.length ? `${exceptions.length}` : undefined} />
      <Text variant="bodySm" tone="secondary">
        Travel, holidays or busy days you already know about. Planned rest is never counted as missed.
      </Text>
      {exceptions.map((e) => (
        <Card key={e.id} inset>
          <Row>
            <Icon name={EXCEPTION_KINDS.find((k) => k.value === e.kind)?.icon ?? 'spa'} size={20} color={c.sage} />
            <Text variant="labelLg" style={{ flex: 1 }}>
              {EXCEPTION_KINDS.find((k) => k.value === e.kind)?.label} · {formatRange(e.start, e.end)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove exception" hitSlop={8} onPress={() => removeException(e.id)} style={{ padding: spacing.sm }}>
              <Icon name="close" size={18} color={c.textTertiary} />
            </Pressable>
          </Row>
        </Card>
      ))}
      <Button
        title="Add exception"
        variant="ghost"
        icon="event-busy"
        onPress={() => {
          setExKind('rest');
          setExOffset(Math.max(0, Math.min(maxOffset, diffDays(commitment.startDate, today))));
          setExLength(1);
          setExOpen(true);
        }}
      />

      <SectionHeader title="Milestones" right="Optional" />
      {milestones.map((m) => (
        <Card key={m.id} inset>
          <Row>
            <Icon name="outlined-flag" size={20} color={c.primaryText} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLg">{m.title}</Text>
              {m.targetSessions ? (
                <Text variant="bodySm" tone="tertiary">
                  After {m.targetSessions} sessions
                </Text>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.title}`} hitSlop={8} onPress={() => deleteMilestone(m.id)} style={{ padding: spacing.sm }}>
              <Icon name="close" size={18} color={c.textTertiary} />
            </Pressable>
          </Row>
        </Card>
      ))}
      <Button
        title="Add milestone"
        variant="ghost"
        icon="outlined-flag"
        onPress={() => {
          setMsTitle('');
          setMsUseSessions(false);
          setMsOpen(true);
        }}
      />

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit commitment">
        <Field label="Name">
          <TextField value={title} onChangeText={setTitle} maxLength={80} accessibilityLabel="Commitment name" />
        </Field>
        <Field label="Duration">
          <DurationPicker value={duration} onChange={setDuration} />
        </Field>
        {isDraft ? (
          <Field label="Start date" hint={startDateLabel(start)}>
            <ChipGroup
              options={[
                { value: today, label: 'Today' },
                { value: addDays(today, 1), label: 'Tomorrow' },
                ...(nextMonday(today) !== addDays(today, 1) ? [{ value: nextMonday(today), label: 'Next Monday' }] : []),
              ]}
              value={start}
              onChange={(v) => setStart(v as string)}
            />
          </Field>
        ) : null}
        <Button
          title="Save"
          disabled={!title.trim()}
          onPress={() => {
            updateCommitment(commitment.id, { title: title.trim(), durationDays: duration, ...(isDraft ? { startDate: start } : null) });
            setEditOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={exOpen} onClose={() => setExOpen(false)} title="Add exception">
        <ChipGroup options={EXCEPTION_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon }))} value={exKind} onChange={(v) => setExKind(v as ExceptionKind)} />
        <Field label="Starts" hint={`Day ${exOffset + 1} of the commitment`}>
          <Stepper value={exOffset + 1} min={1} max={maxOffset + 1} onChange={(v) => setExOffset(v - 1)} unit="day" />
        </Field>
        <Field label="Length">
          <Stepper value={exLength} min={1} max={30} onChange={setExLength} unit={exLength === 1 ? 'day' : 'days'} />
        </Field>
        <Text variant="labelLg" tone="accent">
          {formatRange(exStart, exEnd)}
        </Text>
        <Button
          title="Add exception"
          onPress={() => {
            addException({ habitId: null, commitmentId: commitment.id, start: exStart, end: exEnd, kind: exKind });
            setExOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={msOpen} onClose={() => setMsOpen(false)} title="Add milestone">
        <TextField value={msTitle} onChangeText={setMsTitle} placeholder="e.g. First 10 speaking sessions" maxLength={100} accessibilityLabel="Milestone" />
        <ToggleRow title="Mark reached after a number of sessions" value={msUseSessions} onChange={setMsUseSessions} />
        {msUseSessions ? <Stepper value={msSessions} min={1} max={365} onChange={setMsSessions} unit="sessions" /> : null}
        <Button
          title="Add milestone"
          disabled={!msTitle.trim()}
          onPress={() => {
            addMilestone({ ownerType: 'commitment', ownerId: commitment.id, title: msTitle.trim(), targetSessions: msUseSessions ? msSessions : null });
            setMsOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}
