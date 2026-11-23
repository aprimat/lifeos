import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Pill, SectionHeader } from '@/components/layout';
import { ProgressBar } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { focusLabel } from '@/copy';
import { addMilestone, archiveGoal, deleteMilestone, restoreGoal, setMilestoneAchieved, updateGoal } from '@/data/actions';
import { commitmentProgress, pct, reduceTrend } from '@/domain/analytics';
import { formatRange, formatShort, toISODate } from '@/domain/dates';
import { commitmentEndDate } from '@/domain/schedule';
import { useData, useGoal, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

import { HabitRow, recentConsistency } from './shared';

export function GoalDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoal(id);
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const c = useColors();
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyDraft, setWhyDraft] = useState('');
  const [msOpen, setMsOpen] = useState(false);
  const [msDraft, setMsDraft] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  if (!goal) {
    return (
      <Screen title="Goal" back>
        <EmptyState icon="flag" title="Goal not found" body="It may have been removed." />
      </Screen>
    );
  }

  const commitments = data.commitments.filter((k) => k.goalId === goal.id);
  const active = commitments.find((k) => k.status === 'active' || k.status === 'paused');
  const drafts = commitments.filter((k) => k.status === 'draft');
  const past = commitments.filter((k) => k.status === 'completed' || k.status === 'archived');
  const goalHabits = habits.filter(
    (h) => h.goalId === goal.id && h.status !== 'archived' && (!h.commitmentId || h.commitmentId === active?.id),
  );
  const build = goalHabits.filter((h) => h.kind === 'build');
  const reduce = goalHabits.filter((h) => h.kind === 'reduce');
  const milestones = data.milestones.filter((m) => m.ownerType === 'goal' && m.ownerId === goal.id);
  const progress = active ? commitmentProgress(active, habits, idx, today) : null;

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
          <Pill label={goal.status === 'active' ? 'Active' : goal.status === 'archived' ? 'Archived' : 'Concluded'} tone={goal.status === 'active' ? 'sage' : 'neutral'} />
        </Row>
        <Text variant="headlineLg" accessibilityRole="header">
          {goal.title}
        </Text>
        <Text variant="bodySm" tone="tertiary">
          Since {formatShort(toISODate(new Date(goal.createdAt)))}
        </Text>
      </Stack>

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

      {/* Milestones */}
      <Card>
        <Stack>
          <Row justify="space-between">
            <Row>
              <Icon name="outlined-flag" size={18} color={c.sage} />
              <Text variant="labelLg">Milestones</Text>
            </Row>
            <Button title="Add" size="sm" variant="ghost" icon="add" onPress={() => { setMsDraft(''); setMsOpen(true); }} />
          </Row>
          {goal.desiredOutcome && !milestones.some((m) => m.title === goal.desiredOutcome) ? (
            <Text variant="bodyMd">{goal.desiredOutcome}</Text>
          ) : null}
          {milestones.length === 0 && !goal.desiredOutcome ? (
            <Text variant="bodySm" tone="tertiary">
              Optional checkpoints worth recognising along the way.
            </Text>
          ) : null}
          {milestones.map((m) => (
            <Row key={m.id}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!m.achievedAt }}
                accessibilityLabel={m.title}
                onPress={() => setMilestoneAchieved(m.id, !m.achievedAt)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minHeight: 44 }}>
                <Icon name={m.achievedAt ? 'check-circle' : 'radio-button-unchecked'} size={22} color={m.achievedAt ? c.sage : c.idle} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd">{m.title}</Text>
                  {m.achievedAt ? (
                    <Text variant="labelMd" tone="sage">
                      Reached {formatShort(m.achievedAt)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.title}`} hitSlop={8} onPress={() => deleteMilestone(m.id)} style={{ padding: spacing.sm }}>
                <Icon name="close" size={18} color={c.textTertiary} />
              </Pressable>
            </Row>
          ))}
        </Stack>
      </Card>

      {/* Active commitment */}
      <SectionHeader title="Active commitment" />
      {active && progress ? (
        <Card onPress={() => router.push(`/commitment/${active.id}`)} accessibilityLabel={active.title}>
          <Stack>
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1 }}>
                <Text variant="labelSm" tone="accent" uppercase>
                  {active.status === 'paused' ? 'Paused' : active.durationDays ? `${active.durationDays}-day commitment` : 'Ongoing commitment'}
                </Text>
                <Text variant="headlineSm">{active.title}</Text>
              </View>
              <Text variant="headlineMd" tone="accent" tabular>
                {pct(progress.consistency)}
              </Text>
            </Row>
            {progress.timeRatio !== null ? <ProgressBar value={progress.timeRatio} /> : null}
            <Row justify="space-between">
              <Text variant="labelMd" tone="tertiary" tabular>
                Day {progress.day}
                {progress.totalDays ? ` of ${progress.totalDays}` : ''}
              </Text>
              {progress.daysRemaining !== null ? (
                <Text variant="labelMd" tone="tertiary" tabular>
                  {progress.daysRemaining} days remaining
                </Text>
              ) : null}
            </Row>
          </Stack>
        </Card>
      ) : drafts.length ? (
        drafts.map((d) => (
          <Card key={d.id} onPress={() => router.push(`/commitment/${d.id}/plan`)} accessibilityLabel={`Draft: ${d.title}`}>
            <Row>
              <Pill label="Draft" tone="amber" />
              <Text variant="labelLg" style={{ flex: 1 }}>
                {d.title}
              </Text>
              <Icon name="chevron-right" />
            </Row>
          </Card>
        ))
      ) : (
        <Banner
          icon="timer"
          body="A commitment is a focused period of practice toward this goal."
          action={<Button title="Start a commitment" size="sm" variant="secondary" icon="add" onPress={() => router.push(`/commitment/new?goalId=${goal.id}`)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />}
        />
      )}

      {/* Build habits */}
      {build.length ? (
        <>
          <SectionHeader title="Building habits" right={`${build.length}`} />
          <Stack>
            {build.map((h) => (
              <HabitRow key={h.id} habit={h} right={pct(recentConsistency(h, idx, today))} />
            ))}
          </Stack>
        </>
      ) : null}

      {/* Reduce habits */}
      {reduce.length ? (
        <>
          <SectionHeader title="Behaviours to reduce" right={`${reduce.length}`} />
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
        </>
      ) : null}

      {/* Past commitments */}
      {past.length ? (
        <>
          <SectionHeader title="Past commitments" right={`${past.length}`} />
          <Stack>
            {past.map((k) => {
              const p = commitmentProgress(k, habits, idx, today);
              const end = commitmentEndDate(k) ?? today;
              return (
                <Card key={k.id} onPress={() => router.push(`/commitment/${k.id}`)} accessibilityLabel={k.title}>
                  <Row justify="space-between">
                    <View style={{ flex: 1 }}>
                      <Text variant="labelLg">{k.title}</Text>
                      <Text variant="bodySm" tone="tertiary">
                        {formatRange(k.startDate, end)}
                      </Text>
                    </View>
                    <Pill label={`${pct(p.consistency)} consistency`} tone="sage" />
                  </Row>
                </Card>
              );
            })}
          </Stack>
        </>
      ) : null}

      <Stack>
        <Button title="Create new commitment" icon="add" onPress={() => router.push(`/commitment/new?goalId=${goal.id}`)} />
        <Button title="Add linked habit" variant="secondary" icon="repeat" onPress={() => router.push(`/habit/new?goalId=${goal.id}`)} />
        {goal.status === 'active' ? (
          <Button title="Archive goal" variant="ghost" icon="archive" onPress={() => archiveGoal(goal.id)} />
        ) : (
          <Button title="Restore goal" variant="ghost" icon="unarchive" onPress={() => restoreGoal(goal.id)} />
        )}
        <Text variant="bodySm" tone="tertiary" center>
          Archiving keeps all of your history.
        </Text>
      </Stack>

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

      <Sheet visible={msOpen} onClose={() => setMsOpen(false)} title="Add milestone">
        <TextField value={msDraft} onChangeText={setMsDraft} placeholder="e.g. Lead a meeting in English" maxLength={120} accessibilityLabel="Milestone" autoFocus />
        <Button
          title="Add milestone"
          disabled={!msDraft.trim()}
          onPress={() => {
            addMilestone({ ownerType: 'goal', ownerId: goal.id, title: msDraft.trim() });
            setMsOpen(false);
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
      <View style={{ height: spacing.md, borderRadius: radius.sm }} />
    </Screen>
  );
}
