import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { BreakdownBar } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { addGoalSign, deleteMilestone, setStepDone, habitsOnlyForGoal, letGoGoal, markGoalAchieved, renameMilestone, restoreGoal, setMilestoneAchieved, updateGoal } from '@/data/actions';
import { consistency, habitsBreakdown, pct, reduceTrend } from '@/domain/analytics';
import { addDays, formatShort, formatShortDay, minutesLabel, toISODate } from '@/domain/dates';
import type { Step } from '@/domain/types';
import { useData, useGoal, useGoalSigns, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { HabitRow, recentConsistency } from './shared';
import { StepSheet } from './step-sheet';

const WINDOW_DAYS = 28;

/** A goal (plan v1.4): a result you want, the habits that support it, how they're going, and "achieved". */
export function GoalDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const c = useColors();
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyDraft, setWhyDraft] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [achieveOpen, setAchieveOpen] = useState<false | 'button' | 'signs'>(false);
  const signs = useGoalSigns(id);
  const [signSheet, setSignSheet] = useState<null | { id: string | null }>(null);
  const [signDraft, setSignDraft] = useState('');
  const [letGoOpen, setLetGoOpen] = useState(false);
  const [stepSheet, setStepSheet] = useState<null | { step: Step | null }>(null);
  const [showDoneSteps, setShowDoneSteps] = useState(false);
  const [archiveHabits, setArchiveHabits] = useState(false);
  const data = useData();

  if (!goal) {
    return (
      <Screen title="Goal" back>
        <EmptyState icon="flag" title="Goal not found" body="It may have been removed." />
      </Screen>
    );
  }

  const goalHabits = habits.filter((h) => h.goalIds.includes(goal.id) && h.status !== 'archived');
  const build = goalHabits.filter((h) => h.kind === 'build');
  const reduce = goalHabits.filter((h) => h.kind === 'reduce');
  const recent = habitsBreakdown(goalHabits, addDays(today, -(WINDOW_DAYS - 1)), today, idx, today);
  const achieved = goal.status === 'achieved' || goal.status === 'concluded';
  const statusLabel = goal.status === 'active' ? 'Active' : goal.status === 'archived' ? 'Let go' : 'Achieved';
  const onlyHere = habitsOnlyForGoal(data, goal.id);
  const goalSteps = data.steps.filter((st) => st.goalId === goal.id);
  // Open steps: dated ones by date, then undated, each in the order added.
  const openSteps = goalSteps
    .filter((st) => !st.doneAt)
    .sort((a, b) => (a.date ?? '9999') .localeCompare(b.date ?? '9999') || a.createdAt.localeCompare(b.createdAt));
  const doneSteps = goalSteps.filter((st) => st.doneAt).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  const signsDone = signs.filter((m) => m.achievedAt).length;

  const toggleSign = (signId: string, done: boolean) => {
    setMilestoneAchieved(signId, !done);
    // Ticking the last open sign suggests marking the goal achieved; the user decides.
    if (!done && goal.status === 'active' && signs.every((m) => m.id === signId || m.achievedAt)) setAchieveOpen('signs');
  };
  const openSign = (signId: string | null, title = '') => {
    setSignDraft(title);
    setSignSheet({ id: signId });
  };
  const saveSign = () => {
    const title = signDraft.trim();
    if (!title || !signSheet) return;
    if (signSheet.id) renameMilestone(signSheet.id, title);
    else addGoalSign(goal.id, title);
    setSignSheet(null);
  };

  return (
    <Screen
      title="Goal"
      back
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Rename goal" hitSlop={8} onPress={() => { setTitleDraft(goal.title); setEditOpen(true); }} style={{ padding: spacing.sm }}>
          <Icon name="edit" size={20} />
        </Pressable>
      }>
      <Stack gap={spacing.xs}>
        <Row wrap>
          {goal.focusArea ? <Pill label={focusLabel(goal.focusArea)} tone="primary" /> : null}
          <Pill label={statusLabel} tone={goal.status === 'archived' ? 'neutral' : 'sage'} icon={achieved ? 'emoji-events' : undefined} />
        </Row>
        <Text variant="headlineLg" accessibilityRole="header">
          {goal.title}
        </Text>
        {goal.desiredOutcome ? <Text variant="bodyMd" tone="secondary">{goal.desiredOutcome}</Text> : null}
        <Text variant="bodySm" tone="tertiary">
          Since {formatShort(toISODate(new Date(goal.createdAt)))}
          {achieved && goal.achievedAt ? ` · achieved ${formatShort(goal.achievedAt)}` : ''}
        </Text>
      </Stack>

      {achieved ? (
        <Banner icon="emoji-events" title="You reached this goal" body="Its habits keep going for as long as you want them. Archive any you no longer need." />
      ) : null}
      {goal.status === 'archived' ? (
        <Banner icon="spa" title="You let this goal go" body="Its history is kept. Tap Bring it back below if it matters again." />
      ) : null}

      {/* Signs it's achieved: the user ticks each one when it comes true */}
      <Card>
        <Stack gap={spacing.sm}>
          <Row justify="space-between">
            <Row>
              <Icon name="checklist" size={18} color={c.primaryText} />
              <Text variant="labelLg" tone="accent">
                Signs it&apos;s achieved
              </Text>
            </Row>
            {signs.length ? (
              <Text variant="labelMd" tone="tertiary" tabular>
                {signsDone} of {signs.length}
              </Text>
            ) : null}
          </Row>
          {signs.length ? null : (
            <Text variant="bodyMd" tone="tertiary">
              How will you know you got there? For example: lost 9 kg, can touch my toes, eat healthy most days.
            </Text>
          )}
          {signs.map((m) => {
            const done = !!m.achievedAt;
            return (
              <Row key={m.id} gap={spacing.sm}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={m.title}
                  onPress={() => toggleSign(m.id, done)}
                  style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
                  <Icon name={done ? 'check-box' : 'check-box-outline-blank'} size={24} color={done ? c.primary : c.textTertiary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">{m.title}</Text>
                    {done && m.achievedAt ? (
                      <Text variant="bodySm" tone="tertiary">
                        Since {formatShort(m.achievedAt)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit sign ${m.title}`} hitSlop={8} onPress={() => openSign(m.id, m.title)} style={{ padding: spacing.sm }}>
                  <Icon name="more-horiz" size={20} color={c.textTertiary} />
                </Pressable>
              </Row>
            );
          })}
          <Button title="Add a sign" size="sm" variant="secondary" icon="add" onPress={() => openSign(null)} style={{ alignSelf: 'flex-start' }} />
        </Stack>
      </Card>

      {/* Steps: one-off actions toward the goal */}
      <Card>
        <Stack gap={spacing.sm}>
          <Row justify="space-between">
            <Row>
              <Icon name="flag-circle" size={18} color={c.primaryText} />
              <Text variant="labelLg" tone="accent">
                Steps
              </Text>
            </Row>
            {goalSteps.length ? (
              <Text variant="labelMd" tone="tertiary" tabular>
                {doneSteps.length} of {goalSteps.length}
              </Text>
            ) : null}
          </Row>
          {goalSteps.length ? null : (
            <Text variant="bodyMd" tone="tertiary">
              One-off actions toward this goal, e.g. “Update my CV”. Give one a date and it shows on Today.
            </Text>
          )}
          {openSteps.map((st) => (
            <StepRow key={st.id} step={st} today={today} onEdit={() => setStepSheet({ step: st })} />
          ))}
          {doneSteps.length ? (
            <Button
              title={showDoneSteps ? 'Hide done' : `Done (${doneSteps.length})`}
              variant="ghost"
              size="sm"
              icon={showDoneSteps ? 'expand-less' : 'expand-more'}
              onPress={() => setShowDoneSteps((v) => !v)}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
          {showDoneSteps ? doneSteps.map((st) => <StepRow key={st.id} step={st} today={today} onEdit={() => setStepSheet({ step: st })} />) : null}
          {goal.status !== 'archived' ? (
            <Button title="Add a step" size="sm" variant="secondary" icon="add" onPress={() => setStepSheet({ step: null })} style={{ alignSelf: 'flex-start' }} />
          ) : null}
        </Stack>
      </Card>
      <StepSheet visible={!!stepSheet} onClose={() => setStepSheet(null)} step={stepSheet?.step ?? null} goalId={goal.id} />

      {/* How it's going: the habits that support this goal, last 4 weeks */}
      <Card>
        <Stack gap={spacing.sm}>
          <Text variant="labelSm" tone="tertiary" uppercase>
            Last 4 weeks
          </Text>
          {recent.eligible > 0 ? (
            <>
              <Text variant="headlineLg" tabular>
                {pct(consistency(recent))}
                <Text variant="bodyMd" tone="secondary">{`  ${recent.done} of ${recent.eligible} planned sessions done`}</Text>
              </Text>
              <BreakdownBar b={recent} />
            </>
          ) : (
            <Text variant="bodyMd" tone="secondary">
              {goalHabits.length ? 'Nothing planned yet. Progress appears once your habits have had a few days.' : 'Add a habit to start making progress toward this goal.'}
            </Text>
          )}
        </Stack>
      </Card>

      {/* My Why */}
      <Card>
        <Stack>
          <Row justify="space-between">
            <Row>
              <Icon name="favorite-border" size={18} color={c.primaryText} />
              <Text variant="labelLg" tone="accent">
                My why
              </Text>
            </Row>
            <Button
              title={goal.myWhy ? 'Edit' : 'Add'}
              size="sm"
              variant="secondary"
              icon="edit"
              onPress={() => {
                setWhyDraft(goal.myWhy ?? '');
                setWhyOpen(true);
              }}
            />
          </Row>
          {goal.myWhy ? (
            <Text variant="bodyLg" style={{ fontStyle: 'italic' }}>
              “{goal.myWhy}”
            </Text>
          ) : (
            <Text variant="bodyMd" tone="tertiary">
              Optional. A few words on why this matters to you, if you&apos;d like.
            </Text>
          )}
        </Stack>
      </Card>

      <SectionHeader title="Habits for this goal" right={goalHabits.length ? `${goalHabits.length}` : undefined} />
      {build.length ? (
        <Stack>
          {build.map((h) => (
            <HabitRow key={h.id} habit={h} right={pct(recentConsistency(h, idx, today))} />
          ))}
        </Stack>
      ) : null}
      {reduce.length ? (
        <Stack>
          {reduce.map((h) => {
            const t = reduceTrend(h, today, 7, idx);
            return (
              <HabitRow
                key={h.id}
                habit={h}
                subtitle={`Limit ${t.limit}${t.baseline !== null ? ` · baseline ${t.baseline}` : ''}`}
                right={
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="labelLg" tabular>
                      {t.average === null ? '—' : Math.round(t.average)}
                    </Text>
                    <Text variant="labelSm" tone="tertiary">
                      7-day avg
                    </Text>
                  </View>
                }
              />
            );
          })}
        </Stack>
      ) : null}
      <Button title="Add a habit" variant="secondary" icon="add" onPress={() => router.push(`/habit/new?goalId=${goal.id}`)} />

      <Stack>
        {goal.status === 'active' ? (
          <Button title="Mark as achieved" icon="emoji-events" variant="secondary" onPress={() => setAchieveOpen('button')} />
        ) : null}
        {achieved ? <Button title="Not achieved yet: reopen" variant="ghost" icon="undo" onPress={() => markGoalAchieved(goal.id, false)} /> : null}
        {goal.status === 'archived' ? (
          <Button title="Bring it back" variant="secondary" icon="undo" onPress={() => restoreGoal(goal.id)} />
        ) : (
          <Button
            title="Let it go"
            variant="ghost"
            icon="spa"
            onPress={() => {
              setArchiveHabits(false);
              setLetGoOpen(true);
            }}
          />
        )}
      </Stack>

      <Sheet visible={!!achieveOpen} onClose={() => setAchieveOpen(false)} title={achieveOpen === 'signs' ? 'All signs are there' : 'Mark as achieved?'}>
        <Text variant="bodyMd" tone="secondary">
          {achieveOpen === 'signs'
            ? 'Every sign is ticked. Mark the goal as achieved? Your habits for this goal keep going.'
            : signs.length && signsDone < signs.length
              ? `${signsDone} of ${signs.length} signs ticked. That's fine: you decide when it's achieved. Your habits for this goal keep going.`
              : 'Well done. Your habits for this goal keep going; you can archive any you no longer need.'}
        </Text>
        <Button
          title="Yes, I achieved it"
          icon="emoji-events"
          onPress={() => {
            markGoalAchieved(goal.id);
            setAchieveOpen(false);
          }}
        />
        <Button title="Not yet" variant="ghost" onPress={() => setAchieveOpen(false)} />
      </Sheet>

      <Sheet visible={!!signSheet} onClose={() => setSignSheet(null)} title={signSheet?.id ? 'Edit sign' : 'Add a sign'}>
        <Text variant="bodyMd" tone="secondary">
          Something you&apos;ll notice when the goal is reached.
        </Text>
        <TextField value={signDraft} onChangeText={setSignDraft} maxLength={100} showCount accessibilityLabel="Sign" placeholder="e.g. Lost 9 kg" autoFocus onSubmitEditing={saveSign} />
        <Button title="Save" disabled={!signDraft.trim()} onPress={saveSign} />
        {signSheet?.id ? (
          <Button
            title="Delete sign"
            variant="ghost"
            icon="delete-outline"
            onPress={() => {
              if (signSheet.id) deleteMilestone(signSheet.id);
              setSignSheet(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={letGoOpen} onClose={() => setLetGoOpen(false)} title="Let this goal go?">
        <Text variant="bodyMd" tone="secondary">
          Plans change, and that&apos;s fine. The goal moves to “Let go” in the Goals tab with all its history. You can bring it back any time.
        </Text>
        {onlyHere.length ? (
          <Card selected={archiveHabits} onPress={() => setArchiveHabits((v) => !v)} accessibilityLabel={`Also archive its ${onlyHere.length} habits`}>
            <Row gap={spacing.md}>
              <Icon name={archiveHabits ? 'check-box' : 'check-box-outline-blank'} size={24} color={archiveHabits ? c.primary : c.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text variant="labelLg">
                  Also archive {onlyHere.length === 1 ? 'its habit' : `its ${onlyHere.length} habits`}
                </Text>
                <Text variant="bodySm" tone="secondary">
                  {onlyHere.map((h) => h.title).join(', ')}. Their history is kept.
                  {goalHabits.length > onlyHere.length ? ' Habits that another goal uses keep going.' : ''}
                </Text>
              </View>
            </Row>
          </Card>
        ) : goalHabits.length ? (
          <Text variant="bodySm" tone="tertiary">
            Its habits keep going: another goal uses them.
          </Text>
        ) : null}
        <Button
          title="Let it go"
          icon="spa"
          onPress={() => {
            letGoGoal(goal.id, archiveHabits);
            setLetGoOpen(false);
          }}
        />
        <Button title="Keep it" variant="ghost" onPress={() => setLetGoOpen(false)} />
      </Sheet>

      <Sheet visible={whyOpen} onClose={() => setWhyOpen(false)} title="My why">
        <Text variant="bodyMd" tone="secondary">
          Why does this goal matter to you? It stays private to you.
        </Text>
        <TextField value={whyDraft} onChangeText={setWhyDraft} multiline maxLength={500} showCount accessibilityLabel="My why" placeholder="A sentence is enough." />
        <Button
          title="Save"
          onPress={() => {
            updateGoal(goal.id, { myWhy: whyDraft.trim() || null });
            setWhyOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Rename goal">
        <TextField value={titleDraft} onChangeText={setTitleDraft} maxLength={80} showCount accessibilityLabel="Goal" />
        <Button
          title="Save"
          disabled={!titleDraft.trim()}
          onPress={() => {
            updateGoal(goal.id, { title: titleDraft.trim() });
            setEditOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

/** One step on the goal page: a tick box, its title and date, and ⋯ to edit. */
function StepRow({ step, today, onEdit }: { step: Step; today: string; onEdit: () => void }) {
  const c = useColors();
  const done = !!step.doneAt;
  const late = !done && !!step.date && step.date < today;
  const when = done
    ? `Done ${step.doneAt === today ? 'today' : formatShort(step.doneAt!)}${step.minutes ? ` · ${minutesLabel(step.minutes)}` : ''}`
    : step.date
      ? step.date === today
        ? 'Today'
        : `${late ? 'From ' : ''}${formatShortDay(step.date)}`
      : null;
  return (
    <Row gap={spacing.sm}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${step.title}${when ? `, ${when}` : ''}`}
        onPress={() => setStepDone(step.id, !done)}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
        <Icon name={done ? 'check-box' : 'check-box-outline-blank'} size={24} color={done ? c.sage : c.textTertiary} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMd" strike={done} tone={done ? 'secondary' : 'primary'}>
            {step.title}
          </Text>
          {when ? (
            <Text variant="bodySm" color={late ? c.amber : undefined} tone={late ? undefined : 'tertiary'}>
              {when}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit step ${step.title}`} hitSlop={8} onPress={onEdit} style={{ padding: spacing.sm }}>
        <Icon name="more-horiz" size={20} color={c.textTertiary} />
      </Pressable>
    </Row>
  );
}
