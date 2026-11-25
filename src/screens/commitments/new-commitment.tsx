import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { ChipGroup, SelectableCard } from '@/components/controls';
import { Icon } from '@/components/icon';
import { EmptyState, Field, PageTitle } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { createCommitment, startCommitment } from '@/data/actions';
import { addDays, diffDays, formatShort } from '@/domain/dates';
import { runningCommitment } from '@/domain/schedule';
import { useData, useLiveHabits, useToday } from '@/hooks/use-data';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

import { habitSubtitle } from '../goals/shared';
import { MonthCalendar } from '../habits/month-calendar';
import { COMMITMENT_LENGTHS, pledgeSentence } from './shared';

type Length = number | 'date';

/**
 * Make a commitment (plan v1.4 §7): pick habits, pick a length, confirm one sentence.
 * One at a time; it starts today and never owns the habits.
 * Params: habitIds (comma list, e.g. from "Change" at the end of the previous one).
 */
export function NewCommitment() {
  const params = useLocalSearchParams<{ habitIds?: string }>();
  const data = useData();
  const habits = useLiveHabits();
  const today = useToday();
  const c = useColors();
  const running = runningCommitment(data.commitments, today);

  const choices = useMemo(() => habits.filter((h) => h.status === 'active'), [habits]);
  // Habits created from here (via "New habit") are picked automatically when you come back.
  const [openedAt] = useState(() => new Date().toISOString());
  const [picked, setPicked] = useState<string[]>(() => (params.habitIds ? params.habitIds.split(',') : []));
  const [unpicked, setUnpicked] = useState<string[]>([]);
  const selectedIds = choices
    .filter((h) => picked.includes(h.id) || (h.createdAt > openedAt && !unpicked.includes(h.id)))
    .map((h) => h.id);
  const selected = choices.filter((h) => selectedIds.includes(h.id));
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setPicked((p) => p.filter((x) => x !== id));
      setUnpicked((u) => [...u, id]);
    } else {
      setPicked((p) => [...p, id]);
      setUnpicked((u) => u.filter((x) => x !== id));
    }
  };

  const [length, setLength] = useState<Length>(30);
  const [until, setUntil] = useState(addDays(today, 29));
  const [month, setMonth] = useState(today);
  const days = length === 'date' ? diffDays(today, until) + 1 : length;

  const creating = useRef(false);
  const commit = () => {
    if (creating.current || !selected.length) return;
    creating.current = true;
    const title = length === 'date' ? `Until ${formatShort(until)}` : `${days}-day commitment`;
    const id = createCommitment({ goalId: null, title, startDate: today, durationDays: days, habitIds: selectedIds });
    startCommitment(id);
    router.replace(`/commitment/${id}`);
  };

  if (running) {
    return (
      <Screen title="Make a commitment" back={() => goBack('/habits')}>
        <EmptyState
          icon="track-changes"
          title="One commitment at a time"
          body={`“${running.title}” is running. Finish it or end it early to make a new one.`}
          actionLabel="Open current commitment"
          onAction={() => router.replace(`/commitment/${running.id}`)}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Make a commitment"
      back={() => goBack('/habits')}
      footer={<Button title="I commit" icon="check" disabled={!selected.length || days < 1} onPress={commit} />}>
      <PageTitle title="Promise yourself a period of focus." subtitle="Pick habits, pick how long. Your habits carry on afterwards either way." />

      <Field label="Habits">
        <Stack>
          {choices.map((h) => (
            <SelectableCard
              key={h.id}
              multiple
              icon={h.icon}
              title={h.title}
              description={habitSubtitle(h)}
              selected={selectedIds.includes(h.id)}
              onPress={() => toggle(h.id)}
            />
          ))}
          {choices.length === 0 ? (
            <Text variant="bodySm" tone="tertiary">
              No habits yet. Create one to commit to.
            </Text>
          ) : null}
          <Button title="New habit" variant="ghost" icon="add" onPress={() => router.push('/habit/new?return=1')} />
        </Stack>
      </Field>

      <Field label="How long">
        <ChipGroup
          options={[...COMMITMENT_LENGTHS.map((d) => ({ value: String(d), label: `${d} days` })), { value: 'date', label: 'Until a date' }]}
          value={String(length)}
          onChange={(v) => setLength(v === 'date' ? 'date' : Number(v))}
        />
        {length === 'date' ? (
          <Card>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              today={today}
              onDayPress={(d) => {
                if (d >= today) setUntil(d);
              }}
              cell={(d) => {
                if (d < today) return { fg: c.textTertiary };
                if (d === until) return { bg: c.primary, fg: c.onPrimary, label: 'Last day' };
                if (d > today && d < until) return { bg: c.primarySoft };
                return {};
              }}
            />
          </Card>
        ) : null}
      </Field>

      <Card>
        <Row align="flex-start">
          <Icon name="format-quote" size={22} color={c.primaryText} />
          <Text variant="bodyLg" style={{ flex: 1 }}>
            {pledgeSentence(days, length === 'date' ? until : null, selected)}
          </Text>
        </Row>
      </Card>
      <Text variant="bodySm" tone="tertiary" style={{ paddingHorizontal: spacing.xs }}>
        Starts today, {formatShort(today)}. Today shows how it&apos;s going, and at the end you&apos;ll see how it went.
      </Text>
    </Screen>
  );
}
