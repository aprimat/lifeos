import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row, Stack } from '@/components/card';
import { Chip, ChipGroup, SelectableCard, TextField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Field, PageTitle, Pill, StepHeader } from '@/components/layout';
import { goBack, Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { FOCUS_AREAS, focusLabel } from '@/copy';
import { addGoalSign, completeOnboarding, createGoal } from '@/data/actions';
import type { FocusArea } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

const INSPIRATION: Record<FocusArea | 'any', string[]> = {
  learning: ['Speak English with confidence', 'Read more books', 'Learn a new skill for work'],
  health: ['Sleep better', 'Move a little every day', 'Have more steady energy'],
  focus: ['Do deep work every weekday', 'Spend less time scrolling', 'Finish what I start'],
  wellbeing: ['Live more mindfully', 'Feel calmer during the week', 'Rest without guilt'],
  relationships: ['Be more present with family', 'Stay in touch with friends', 'Listen more closely'],
  growth: ['Reflect on what matters each week', 'Build a journaling practice', 'Get clearer about my direction'],
  any: ['Improve my English', 'Sleep better', 'Live more mindfully'],
};

const THOUGHT_STARTERS = [
  'How would your days feel different?',
  'Who benefits when you show up for this?',
  'What would make this feel worth it?',
];

type Next = 'commitment' | 'habit' | 'later';

export function GoalWizard() {
  const params = useLocalSearchParams<{ onboarding?: string; next?: string }>();
  const onboarding = params.onboarding === '1';
  const c = useColors();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [signs, setSigns] = useState<string[]>([]);
  const [signDraft, setSignDraft] = useState('');
  const [why, setWhy] = useState('');
  const [next, setNext] = useState<Next>(params.next === 'habit' ? 'habit' : params.next === 'commitment' ? 'commitment' : 'commitment');

  const ob = onboarding ? '&onboarding=1' : '';

  const finish = async () => {
    const id = createGoal({
      title: title.trim(),
      focusArea,
      myWhy: why.trim() || null,
      desiredOutcome: null,
    });
    // A typed sign that wasn't added with "Add" still counts.
    for (const s of [...signs, signDraft].map((x) => x.trim()).filter(Boolean)) addGoalSign(id, s);
    if (next === 'commitment') router.replace(`/commitment/new?goalId=${id}${ob}`);
    else if (next === 'habit') router.replace(`/habit/new?goalId=${id}${ob}`);
    else if (onboarding) {
      await completeOnboarding();
      router.replace('/today');
    } else router.replace(`/goal/${id}`);
  };

  const addSign = () => {
    const s = signDraft.trim();
    if (!s) return;
    setSigns((cur) => [...cur, s]);
    setSignDraft('');
  };

  const back = () => (step > 1 ? setStep(step - 1) : goBack('/habits'));

  const footer =
    step === 1 ? (
      <Button title="Continue" iconRight="arrow-forward" disabled={!title.trim()} onPress={() => setStep(2)} />
    ) : step === 2 ? (
      <>
        <Button title="Continue" iconRight="arrow-forward" onPress={() => setStep(3)} />
        {!why.trim() ? <Button title="Skip for now" variant="ghost" onPress={() => setStep(3)} /> : null}
      </>
    ) : (
      <Button title={next === 'later' ? 'Save goal' : 'Save and continue'} iconRight="arrow-forward" onPress={finish} />
    );

  return (
    <Screen title="New goal" back={back} footer={footer}>
      <StepHeader step={step} total={3} label={step === 1 ? 'Direction' : step === 2 ? 'Motivation' : 'Next step'} />

      {step === 1 ? (
        <>
          <PageTitle
            title="What would you like to achieve?"
            subtitle="A goal is a direction, not a deadline. Small, steady habits will give it shape."
          />
          <Field label="Goal">
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Improve my English"
              maxLength={80}
              showCount
              accessibilityLabel="Goal"
              autoFocus
            />
          </Field>
          <Field label="Focus area" optional>
            <ChipGroup
              options={FOCUS_AREAS.map((f) => ({ value: f.value, label: f.label, icon: f.icon }))}
              value={focusArea}
              onChange={(v) => setFocusArea((v as FocusArea) === focusArea ? null : (v as FocusArea))}
            />
          </Field>
          <Field label="How will you know it's achieved?" optional hint="A few signs you'll tick when they come true. No sub-goals needed.">
            <Stack gap={spacing.sm}>
              {signs.map((s, i) => (
                <Row key={`${i}-${s}`} gap={spacing.sm}>
                  <Icon name="check-box-outline-blank" size={20} color={c.textTertiary} />
                  <Text variant="bodyMd" style={{ flex: 1 }}>
                    {s}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove sign ${s}`} hitSlop={8} onPress={() => setSigns((cur) => cur.filter((_, j) => j !== i))} style={{ padding: spacing.xs }}>
                    <Icon name="close" size={18} color={c.textTertiary} />
                  </Pressable>
                </Row>
              ))}
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={signDraft}
                    onChangeText={setSignDraft}
                    placeholder={signs.length ? 'Another sign' : 'e.g. Lost 9 kg'}
                    maxLength={100}
                    accessibilityLabel="Sign it's achieved"
                    returnKeyType="done"
                    onSubmitEditing={addSign}
                  />
                </View>
                <Button title="Add" size="sm" variant="secondary" icon="add" disabled={!signDraft.trim()} onPress={addSign} />
              </Row>
            </Stack>
          </Field>
          <Card>
            <Stack>
              <Row>
                <Icon name="lightbulb-outline" size={18} color={c.amber} />
                <Text variant="labelLg">Need inspiration?</Text>
              </Row>
              {INSPIRATION[focusArea ?? 'any'].map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`Use: ${s}`}
                  onPress={() => setTitle(s)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 44,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    backgroundColor: c.inset,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Text variant="bodyMd" style={{ flex: 1 }}>
                    {s}
                  </Text>
                  <Icon name="add" size={18} />
                </Pressable>
              ))}
            </Stack>
          </Card>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <PageTitle
            title="Why does this matter to you?"
            subtitle="Optional. A few words about why this goal matters. You can skip this or change it any time."
          />
          <Card>
            <Stack>
              <Row justify="space-between">
                <Text variant="labelMd" tone="tertiary" uppercase>
                  Goal
                </Text>
                {focusArea ? <Pill label={focusLabel(focusArea)} tone="sage" /> : null}
              </Row>
              <Text variant="headlineSm">{title}</Text>
            </Stack>
          </Card>
          <Field label="My why" optional>
            <TextField
              value={why}
              onChangeText={setWhy}
              multiline
              maxLength={500}
              showCount
              placeholder="e.g. I want to feel more confident speaking at work."
              accessibilityLabel="My why"
            />
          </Field>
          <Stack>
            <Text variant="labelSm" tone="tertiary" uppercase>
              Thought starters
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {THOUGHT_STARTERS.map((t) => (
                <Chip key={t} small label={t} onPress={() => setWhy((w) => (w.trim() ? `${w.trim()}\n${t} ` : `${t} `))} />
              ))}
            </View>
          </Stack>
          <Banner icon="lock-outline" title="Private to you" body="Saved on this device. Only you can see it." />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <PageTitle title="What would you like to do next?" subtitle="You can always add more later." />
          <SelectableCard
            icon="timer"
            title="Start a commitment"
            description="A focused 30, 60 or 90-day period with a few habits."
            selected={next === 'commitment'}
            onPress={() => setNext('commitment')}
          />
          <SelectableCard
            icon="repeat"
            title="Add a habit"
            description="One small, repeatable action linked to this goal."
            selected={next === 'habit'}
            onPress={() => setNext('habit')}
          />
          <SelectableCard
            icon="schedule"
            title="Decide later"
            description="Save the goal for now and come back to it."
            selected={next === 'later'}
            onPress={() => setNext('later')}
          />
        </>
      ) : null}
    </Screen>
  );
}
