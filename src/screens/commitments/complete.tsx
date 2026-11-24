import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { SelectableCard, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, EmptyState, Field, PageTitle, SectionHeader } from '@/components/layout';
import { ProgressRing } from '@/components/progress';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import {
  endCommitment,
  extendCommitment,
  keepHabitsOngoing,
  renewCommitment,
  saveCommitmentReview,
} from '@/data/actions';
import { commitmentProgress, pct } from '@/domain/analytics';
import { formatRange, formatShort, minutesLabel } from '@/domain/dates';
import type { CommitmentNextStep } from '@/domain/types';
import { useCommitment, useData, useGoal, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

const NEXT_STEPS: { value: CommitmentNextStep; title: string; description: string; icon: string }[] = [
  { value: 'renew', title: 'Renew', description: 'Another period of the same length with the same habits.', icon: 'autorenew' },
  { value: 'extend', title: 'Extend by 30 days', description: 'Keep this commitment going a little longer.', icon: 'date-range' },
  { value: 'adjust', title: 'Renew with a bit more', description: 'Same habits with slightly larger targets. You can edit them afterwards.', icon: 'trending-up' },
  { value: 'new', title: 'Start a new commitment', description: 'Choose different habits for the same goal.', icon: 'add-circle-outline' },
  { value: 'keepHabits', title: 'Keep the habits going', description: 'Continue them as everyday habits with no end date.', icon: 'all-inclusive' },
  { value: 'finish', title: 'Finish and archive', description: 'Close this chapter. Everything you logged is kept.', icon: 'inventory-2' },
];

export function CommitmentComplete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commitment = useCommitment(id);
  const goal = useGoal(commitment?.goalId ?? undefined);
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const c = useColors();
  const existing = data.commitmentReviews.find((r) => r.commitmentId === id);
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [stillMatters, setStillMatters] = useState<'yes' | 'changed' | null>(existing?.stillMatters ?? null);
  const [next, setNext] = useState<CommitmentNextStep>(existing?.nextStep ?? 'renew');
  // Renew/adjust create a new commitment: a double tap must not create two.
  const confirming = useRef(false);

  if (!commitment) {
    return (
      <Screen title="Commitment" back>
        <EmptyState icon="timer" title="Commitment not found" body="It may have been removed." />
      </Screen>
    );
  }

  const p = commitmentProgress(commitment, habits, idx, today);
  const b = p.breakdown;
  const cHabits = habits.filter((h) => h.commitmentId === commitment.id);
  const milestones = data.milestones.filter((m) => m.ownerType === 'commitment' && m.ownerId === commitment.id && m.achievedAt);
  const end = p.endDate ?? today;
  const days = p.totalDays ? Math.min(p.day, p.totalDays) : p.day;

  // Self-reported automaticity change (first vs latest rating within the commitment).
  const ease = cHabits
    .map((h) => {
      const rs = data.automaticity
        .filter((a) => a.habitId === h.id && a.date >= commitment.startDate && a.date <= end)
        .sort((x, y) => x.date.localeCompare(y.date));
      return rs.length >= 2 ? { habit: h, from: rs[0].score, to: rs[rs.length - 1].score } : null;
    })
    .filter(Boolean) as { habit: (typeof cHabits)[number]; from: number; to: number }[];

  const confirm = () => {
    if (confirming.current) return;
    confirming.current = true;
    saveCommitmentReview({ commitmentId: commitment.id, reflection: reflection.trim() || null, stillMatters, nextStep: next });
    switch (next) {
      case 'renew': {
        const nid = renewCommitment(commitment.id, { durationDays: commitment.durationDays });
        router.replace(nid ? `/commitment/${nid}` : '/goals');
        break;
      }
      case 'adjust': {
        const nid = renewCommitment(commitment.id, { durationDays: commitment.durationDays, targetScale: 1.25 });
        router.replace(nid ? `/commitment/${nid}` : '/goals');
        break;
      }
      case 'extend':
        extendCommitment(commitment.id, 30);
        router.replace(`/commitment/${commitment.id}`);
        break;
      case 'new':
        endCommitment(commitment.id, 'completed');
        router.replace(commitment.goalId ? `/commitment/new?goalId=${commitment.goalId}` : '/commitment/new');
        break;
      case 'keepHabits':
        endCommitment(commitment.id, 'completed');
        keepHabitsOngoing(commitment.id);
        router.replace(commitment.goalId ? `/goal/${commitment.goalId}` : '/goals');
        break;
      case 'finish':
        endCommitment(commitment.id, 'completed');
        router.replace(commitment.goalId ? `/goal/${commitment.goalId}` : '/goals');
        break;
    }
  };

  const saveDraft = () => {
    saveCommitmentReview({ commitmentId: commitment.id, reflection: reflection.trim() || null, stillMatters, nextStep: null });
    router.back();
  };

  return (
    <Screen
      title="Look back"
      back
      footer={
        <>
          <Button title="Confirm next step" iconRight="arrow-forward" onPress={confirm} />
          <Button title="Decide later" variant="ghost" onPress={saveDraft} />
        </>
      }>
      <PageTitle
        eyebrow={p.endDate && today > p.endDate ? 'Commitment complete' : 'Looking back'}
        title={commitment.title}
        subtitle={goal ? `Part of “${goal.title}”. The goal continues — this was one chapter of it.` : 'One chapter of practice.'}
      />

      <Card>
        <Row justify="space-between">
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="labelSm" tone="tertiary" uppercase>
              Sessions done
            </Text>
            <Text variant="headlineLg" tabular>
              {b.done}
              <Text variant="bodyMd" tone="secondary">{` of ${b.eligible} planned`}</Text>
            </Text>
            <Text variant="bodySm" tone="secondary">
              {formatRange(commitment.startDate, end)} · {days} days
            </Text>
          </View>
          <ProgressRing value={p.consistency} size={80} label={pct(p.consistency)} />
        </Row>
      </Card>

      <Row gap={spacing.sm} align="stretch">
        <Card style={{ flex: 1 }}>
          <Icon name="schedule" size={20} color={c.primaryText} />
          <Text variant="labelSm" tone="tertiary" uppercase style={{ marginTop: spacing.sm }}>
            Time invested
          </Text>
          <Text variant="headlineMd" tabular>
            {p.minutes > 0 ? minutesLabel(p.minutes) : '—'}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Icon name="spa" size={20} color={c.sage} />
          <Text variant="labelSm" tone="tertiary" uppercase style={{ marginTop: spacing.sm }}>
            Rest days
          </Text>
          <Text variant="headlineMd" tabular>
            {b.rest}
          </Text>
          <Text variant="bodySm" tone="secondary">
            planned and respected
          </Text>
        </Card>
      </Row>

      {b.minimum + b.partial > 0 ? (
        <Banner icon="eco" body={`${b.minimum + b.partial} session${b.minimum + b.partial === 1 ? ' was' : 's were'} a smaller version — showing up still counts.`} />
      ) : null}

      {ease.length ? (
        <Card>
          <Stack>
            <Text variant="labelSm" tone="tertiary" uppercase>
              How natural it feels (self-reported)
            </Text>
            {ease.map((e) => (
              <Row key={e.habit.id} justify="space-between">
                <Text variant="bodyMd" style={{ flex: 1 }}>
                  {e.habit.title}
                </Text>
                <Text variant="labelLg" tabular>
                  {e.from} → {e.to} / 10
                </Text>
              </Row>
            ))}
          </Stack>
        </Card>
      ) : null}

      {milestones.length ? (
        <>
          <SectionHeader title="Milestones reached" right={`${milestones.length}`} />
          {milestones.map((m) => (
            <Row key={m.id}>
              <Icon name="check-circle" size={20} color={c.sage} />
              <Text variant="bodyMd" style={{ flex: 1 }}>
                {m.title}
              </Text>
              <Text variant="labelMd" tone="tertiary">
                {formatShort(m.achievedAt!)}
              </Text>
            </Row>
          ))}
        </>
      ) : null}

      <SectionHeader title="Reflection" />
      <Field label="What shifted for you during this time?" optional>
        <TextField value={reflection} onChangeText={setReflection} multiline maxLength={600} placeholder="A sentence or two is plenty." accessibilityLabel="Reflection" />
      </Field>

      {goal ? (
        <Field label="Does this goal still matter to you for the same reasons?" optional>
          <Stack>
            <SelectableCard title="Yes" description={goal.myWhy ? `“${goal.myWhy}”` : undefined} selected={stillMatters === 'yes'} onPress={() => setStillMatters('yes')} />
            <SelectableCard title="My reasons have changed" description="You can rewrite your why on the goal." selected={stillMatters === 'changed'} onPress={() => setStillMatters('changed')}>
              {stillMatters === 'changed' ? (
                <Button title="Edit my why" size="sm" variant="secondary" icon="edit" onPress={() => router.push(`/goal/${goal.id}`)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />
              ) : null}
            </SelectableCard>
          </Stack>
        </Field>
      ) : null}

      <SectionHeader title="What comes next" />
      <Stack>
        {NEXT_STEPS.filter((s) => s.value !== 'extend' || commitment.durationDays !== null).map((s) => (
          <SelectableCard key={s.value} icon={s.icon} title={s.title} description={s.description} selected={next === s.value} onPress={() => setNext(s.value)} />
        ))}
      </Stack>
      <Banner icon="history" body="Whatever you choose, this commitment and everything you logged stay in your history." />
    </Screen>
  );
}
