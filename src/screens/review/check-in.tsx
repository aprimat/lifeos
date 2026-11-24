import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Stack } from '@/components/card';
import { ChipGroup, ScalePicker, SelectableCard, TextField, ToggleRow } from '@/components/controls';
import { Banner, Field, PageTitle, Pill } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DISPOSITIONS } from '@/copy';
import { saveCheckIn } from '@/data/actions';
import { useStore } from '@/data/store';
import { formatShort } from '@/domain/dates';
import type { Disposition } from '@/domain/types';
import { useToday } from '@/hooks/use-data';
import { spacing } from '@/theme/tokens';

const SLEEP = [
  { value: '<6', label: '< 6 hrs' },
  { value: '6-7', label: '6–7 hrs' },
  { value: '7-8', label: '7–8 hrs' },
  { value: '8-9', label: '8–9 hrs' },
  { value: '9+', label: '9+ hrs' },
];

export function CheckInScreen() {
  const today = useToday();
  const params = useLocalSearchParams<{ date?: string; disposition?: string }>();
  const date = params.date ?? today;
  const existing = useStore((s) => s.data.checkIns.find((c) => c.date === date));

  const [disposition, setDisposition] = useState<Disposition | null>(
    existing?.disposition ?? ((params.disposition as Disposition | undefined) ?? null),
  );
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [stress, setStress] = useState<number | null>(existing?.stress ?? null);
  const [sleep, setSleep] = useState<string | null>(existing?.sleepHours ?? null);
  const [restorative, setRestorative] = useState<boolean>(existing?.sleepRestorative ?? false);
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    saveCheckIn({
      date,
      disposition,
      energy,
      stress,
      sleepHours: sleep,
      sleepRestorative: sleep ? restorative : null,
      note: note.trim() || null,
    });
    goBack('/today');
  };

  return (
    <Screen
      title="Daily check-in"
      close
      footer={
        <>
          <Button title="Save check-in" iconRight="arrow-forward" onPress={save} />
          <Button variant="ghost" title="Skip for today" onPress={() => goBack('/today')} />
        </>
      }>
      <Pill label={`Optional moment · ${date === today ? 'Today' : formatShort(date)}`} tone="primary" />
      <PageTitle
        title="How are you feeling?"
        subtitle="A quiet check-in to notice your baseline. Completely optional and private."
      />

      <Card>
        <Stack gap={spacing.sm}>
          <Text variant="headlineSm">Overall</Text>
          <Text variant="bodySm" tone="secondary">
            Choose what fits best right now.
          </Text>
          {DISPOSITIONS.map((d) => (
            <SelectableCard
              key={d.value}
              title={d.label}
              description={d.hint}
              icon={d.icon}
              selected={disposition === d.value}
              onPress={() => setDisposition(disposition === d.value ? null : d.value)}
            />
          ))}
        </Stack>
      </Card>

      <Card>
        <Field label="Energy">
          <ScalePicker value={energy} onChange={setEnergy} labels={['Exhausted', 'Low', 'Moderate', 'Vital', 'Peak']} />
        </Field>
      </Card>

      <Card>
        <Field label="Stress and tension">
          <ScalePicker value={stress} onChange={setStress} labels={['At ease', 'Light', 'Some', 'Elevated', 'High']} />
        </Field>
      </Card>

      <Card>
        <Field label="Sleep last night" optional>
          <ChipGroup small options={SLEEP} value={sleep} onChange={(v) => setSleep(sleep === v ? null : (v as string))} />
          {sleep ? (
            <View style={{ marginHorizontal: -spacing.md }}>
              <ToggleRow title="Felt restorative" icon="hotel" value={restorative} onChange={setRestorative} />
            </View>
          ) : null}
        </Field>
      </Card>

      <Card>
        <Field label="Personal note" optional>
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder="Any context behind today (a late night, a good walk…)"
            multiline
            maxLength={500}
          />
        </Field>
      </Card>

      <Banner icon="lock-outline" body="Check-ins are never scored. They're just for you." />
    </Screen>
  );
}
