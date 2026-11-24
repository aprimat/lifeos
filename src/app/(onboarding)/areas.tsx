import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { SelectableCard } from '@/components/controls';
import { Banner, PageTitle, StepHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { FOCUS_AREAS } from '@/copy';
import { useStore } from '@/data/store';
import type { FocusArea } from '@/domain/types';

/** Onboarding step 1 of 2 — focus areas (Stitch: areas_to_improve). */
export default function AreasRoute() {
  const initial = useStore((s) => s.user?.focusAreas ?? []);
  const updateUser = useStore((s) => s.updateUser);
  const [selected, setSelected] = useState<FocusArea[]>(initial);

  const toggle = (a: FocusArea) =>
    setSelected((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const next = async (save: boolean) => {
    if (save) await updateUser({ focusAreas: selected });
    router.push('/start');
  };

  return (
    <Screen
      title="Your focus"
      right={<Button title="Skip" variant="ghost" size="sm" onPress={() => next(false)} />}
      footer={<Button title="Continue" iconRight="arrow-forward" onPress={() => next(true)} testID="areas-continue" />}>
      <StepHeader step={1} total={2} label="Personal focus" />
      <PageTitle
        title="What areas matter most right now?"
        subtitle="Choose one or more. This only shapes suggestions — you can change it anytime."
      />
      {FOCUS_AREAS.map((a) => (
        <SelectableCard
          key={a.value}
          multiple
          title={a.label}
          description={a.description}
          icon={a.icon}
          selected={selected.includes(a.value)}
          onPress={() => toggle(a.value)}
          testID={`area-${a.value}`}
        />
      ))}
      <Banner title="Start where you are" body="Small, steady steps add up. There's no right number of areas." />
      <Text variant="labelMd" tone="tertiary" center>
        {selected.length === 0 ? 'Nothing selected yet' : `${selected.length} selected`}
      </Text>
    </Screen>
  );
}
