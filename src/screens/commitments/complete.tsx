import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { SelectableCard, TextField } from '@/components/controls';
import { Banner, EmptyState, Field, PageTitle, SectionHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { endCommitment, keepHabitsOngoing, renewCommitment, saveCommitmentReview } from '@/data/actions';
import { commitmentProgress } from '@/domain/analytics';
import { missSummary } from '@/domain/misses';
import { periodReport } from '@/domain/report';
import { formatRange } from '@/domain/dates';
import type { CommitmentNextStep } from '@/domain/types';
import { useCommitment, useData, useIndex, useLiveHabits, useToday } from '@/hooks/use-data';

import { ReportBody } from '../progress/report';
import { pledgeSentence } from './shared';

const NEXT_STEPS: { value: CommitmentNextStep; title: string; description: string; icon: string }[] = [
  { value: 'renew', title: 'Renew', description: 'The same habits for another period of the same length.', icon: 'autorenew' },
  { value: 'new', title: 'Change', description: 'Pick the habits and the length again.', icon: 'tune' },
  { value: 'finish', title: 'Done', description: 'Close this chapter. Your habits keep going.', icon: 'check' },
];

export function CommitmentComplete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commitment = useCommitment(id);
  const data = useData();
  const habits = useLiveHabits();
  const idx = useIndex();
  const today = useToday();
  const existing = data.commitmentReviews.find((r) => r.commitmentId === id);
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [next, setNext] = useState<CommitmentNextStep>(
    existing?.nextStep && NEXT_STEPS.some((s) => s.value === existing.nextStep) ? existing.nextStep : 'renew',
  );
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
  const cHabits = habits.filter((h) => commitment.habitIds.includes(h.id));
  const report = periodReport(cHabits, commitment.startDate, p.endDate ?? today, idx, today, { includeTrailingWeek: true });
  const misses = missSummary(cHabits, data.reflections, commitment.startDate, p.endDate ?? today, idx, today);
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
    saveCommitmentReview({ commitmentId: commitment.id, reflection: reflection.trim() || null, stillMatters: existing?.stillMatters ?? null, nextStep: next });
    switch (next) {
      case 'renew': {
        const nid = renewCommitment(commitment.id, { durationDays: commitment.durationDays });
        router.replace(nid ? `/commitment/${nid}` : '/habits');
        break;
      }
      case 'new':
        endCommitment(commitment.id, 'completed');
        keepHabitsOngoing(commitment.id);
        router.replace(`/commitment/new?habitIds=${commitment.habitIds.join(',')}`);
        break;
      default:
        endCommitment(commitment.id, 'completed');
        keepHabitsOngoing(commitment.id);
        router.replace('/habits');
        break;
    }
  };

  const saveDraft = () => {
    saveCommitmentReview({ commitmentId: commitment.id, reflection: reflection.trim() || null, stillMatters: existing?.stillMatters ?? null, nextStep: null });
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
        subtitle={pledgeSentence(p.totalDays ?? p.day, null, cHabits)}
      />

      <Text variant="bodySm" tone="tertiary">
        {formatRange(commitment.startDate, end)} · {days} days
      </Text>
      <ReportBody report={report} misses={misses} />

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


      <SectionHeader title="Reflection" />
      <Field label="What shifted for you during this time?" optional>
        <TextField value={reflection} onChangeText={setReflection} multiline maxLength={600} placeholder="A sentence or two is plenty." accessibilityLabel="Reflection" />
      </Field>


      <SectionHeader title="What comes next" />
      <Stack>
        {NEXT_STEPS.map((s) => (
          <SelectableCard key={s.value} icon={s.icon} title={s.title} description={s.description} selected={next === s.value} onPress={() => setNext(s.value)} />
        ))}
      </Stack>
      <Banner icon="history" body="Whatever you choose, this commitment and everything you logged stay in your history." />
    </Screen>
  );
}
