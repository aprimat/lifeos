import type { FocusArea, HabitKind, HabitVersion, ID, ISODate } from '@/domain/types';

import { addMilestone, createCommitment, createGoal, createHabit } from './actions';

/** Starter templates (IMPLEMENTATION_PLAN.md §4). Starting points only — everything is editable. */

export interface TemplateHabit {
  key: string;
  kind: HabitKind;
  title: string;
  icon: string;
  version: Omit<HabitVersion, 'effectiveFrom'>;
  optional?: boolean;
  description: string;
}

export interface TemplateQuestion {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface Template {
  id: string;
  title: string;
  focusArea: FocusArea;
  icon: string;
  summary: string;
  goalTitle: string;
  commitmentTitle: string;
  durationDays: number;
  questions: TemplateQuestion[];
  milestones: { title: string; targetSessions: number }[];
  habits(answers: Record<string, string>): TemplateHabit[];
}

const WEEKDAYS = { type: 'weekdays' as const, weekdays: [0, 1, 2, 3, 4] };
const DAILY = { type: 'daily' as const };

const dur = (target: number, minimum: number | null, minimumLabel: string | null = null) => ({
  trackingType: 'duration' as const,
  target,
  unit: 'min',
  minimum,
  minimumLabel,
});

function v(partial: Partial<Omit<HabitVersion, 'effectiveFrom'>>): Omit<HabitVersion, 'effectiveFrom'> {
  return {
    schedule: DAILY,
    build: null,
    reduce: null,
    timeOfDay: 'anytime',
    reminderTime: null,
    anchor: null,
    ...partial,
  };
}

export const TEMPLATES: Template[] = [
  {
    id: 'english',
    title: 'Speak English with confidence',
    focusArea: 'learning',
    icon: 'translate',
    summary: 'Short daily speaking, listening and vocabulary practice on weekdays.',
    goalTitle: 'Improve my English',
    commitmentTitle: 'Practice English consistently',
    durationDays: 30,
    questions: [
      {
        id: 'level',
        label: 'How would you describe your English today?',
        options: [
          { value: 'beginner', label: 'Getting started' },
          { value: 'intermediate', label: 'Comfortable with basics' },
          { value: 'advanced', label: 'Fluent, want more confidence' },
        ],
      },
      {
        id: 'focus',
        label: 'What would you like to focus on?',
        options: [
          { value: 'speaking', label: 'Speaking' },
          { value: 'listening', label: 'Listening' },
          { value: 'vocabulary', label: 'Vocabulary' },
        ],
      },
    ],
    milestones: [
      { title: 'First 5 speaking sessions', targetSessions: 5 },
      { title: '20 speaking sessions', targetSessions: 20 },
    ],
    habits: (a) => {
      const beginner = a.level === 'beginner';
      return [
        {
          key: 'speak',
          kind: 'build',
          title: 'Practice speaking',
          icon: 'record-voice-over',
          description: 'Speak aloud — describe your day, read a page, or record a voice note.',
          version: v({ schedule: WEEKDAYS, build: dur(a.focus === 'speaking' ? 15 : beginner ? 5 : 10, 2, '2-minute voice note'), timeOfDay: 'morning', anchor: 'After my morning coffee' }),
        },
        {
          key: 'listen',
          kind: 'build',
          title: 'Listen to English',
          icon: 'headphones',
          description: 'A podcast, video or audiobook at a comfortable pace.',
          version: v({ schedule: WEEKDAYS, build: dur(a.focus === 'listening' ? 20 : 15, 5), timeOfDay: 'afternoon', anchor: 'During my commute' }),
        },
        {
          key: 'words',
          kind: 'build',
          title: 'Learn new words',
          icon: 'menu-book',
          description: 'Capture words or phrases you met today and use them in a sentence.',
          version: v({
            schedule: WEEKDAYS,
            build: { trackingType: 'quantity', target: a.focus === 'vocabulary' ? 8 : 5, unit: 'words', minimum: 2, minimumLabel: null },
            timeOfDay: 'evening',
            anchor: 'During my wind-down',
          }),
        },
        {
          key: 'nosocial',
          kind: 'reduce',
          title: 'No social media during study time',
          icon: 'phonelink-erase',
          optional: true,
          description: 'Keep practice time free from feeds.',
          version: v({
            schedule: WEEKDAYS,
            reduce: { mode: 'avoid', unit: 'times', baseline: null, limit: 0, finalTarget: null, triggers: [], sensitive: false },
          }),
        },
      ];
    },
  },
  {
    id: 'deep-focus',
    title: 'Deep focus',
    focusArea: 'focus',
    icon: 'center-focus-strong',
    summary: 'A protected deep-work block each weekday and fewer reactive checks.',
    goalTitle: 'Work with more focus',
    commitmentTitle: 'Protect a daily deep-work block',
    durationDays: 60,
    questions: [
      {
        id: 'start',
        label: 'When does your workday usually start?',
        options: [
          { value: 'early', label: 'Before 8 AM' },
          { value: 'mid', label: '8–10 AM' },
          { value: 'late', label: 'After 10 AM' },
        ],
      },
    ],
    milestones: [{ title: '10 deep-work blocks', targetSessions: 10 }],
    habits: (a) => [
      {
        key: 'deepwork',
        kind: 'build',
        title: 'Deep work block',
        icon: 'laptop',
        description: 'One block of single-task work with notifications off.',
        version: v({
          schedule: WEEKDAYS,
          build: dur(90, 25, 'One 25-minute block'),
          timeOfDay: a.start === 'late' ? 'afternoon' : 'morning',
          anchor: 'Before opening email',
        }),
      },
      {
        key: 'checks',
        kind: 'reduce',
        title: 'Email and chat checks',
        icon: 'mark-email-unread',
        description: 'Check messages at set times instead of reacting all day.',
        version: v({
          schedule: WEEKDAYS,
          reduce: { mode: 'limit', unit: 'checks', baseline: null, limit: 3, finalTarget: null, triggers: [], sensitive: false },
        }),
      },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleep restoration',
    focusArea: 'health',
    icon: 'bedtime',
    summary: 'A calmer evening routine and screens off before bed.',
    goalTitle: 'Sleep better',
    commitmentTitle: 'Rebuild my evening rhythm',
    durationDays: 30,
    questions: [
      {
        id: 'bedtime',
        label: 'What bedtime would you like to aim for?',
        options: [
          { value: '22:00', label: '10:00 PM' },
          { value: '22:30', label: '10:30 PM' },
          { value: '23:00', label: '11:00 PM' },
        ],
      },
    ],
    milestones: [{ title: '14 calm evenings', targetSessions: 14 }],
    habits: (a) => [
      {
        key: 'screens',
        kind: 'build',
        title: 'Screens off before bed',
        icon: 'phonelink-off',
        description: `Put screens away about an hour before ${a.bedtime === '23:00' ? '11:00 PM' : a.bedtime === '22:30' ? '10:30 PM' : '10:00 PM'}.`,
        version: v({ build: { trackingType: 'check', target: 1, unit: 'time', minimum: null, minimumLabel: null }, timeOfDay: 'evening', anchor: 'After dinner clean-up' }),
      },
      {
        key: 'winddown',
        kind: 'build',
        title: 'Evening wind-down',
        icon: 'self-improvement',
        description: 'Stretching, reading or a few slow breaths.',
        version: v({ build: dur(10, 3), timeOfDay: 'evening' }),
      },
      {
        key: 'sleep',
        kind: 'build',
        title: 'Log hours slept',
        icon: 'hotel',
        description: 'A quick note of how long you slept.',
        version: v({ build: { trackingType: 'quantity', target: 7, unit: 'hours', minimum: null, minimumLabel: null }, timeOfDay: 'morning' }),
      },
    ],
  },
  {
    id: 'mindful-mornings',
    title: 'Mindful mornings',
    focusArea: 'wellbeing',
    icon: 'spa',
    summary: 'A few quiet minutes and one line of gratitude each morning.',
    goalTitle: 'Live more mindfully',
    commitmentTitle: 'Start each day calmly',
    durationDays: 30,
    questions: [
      {
        id: 'time',
        label: 'When would this fit best?',
        options: [
          { value: 'morning', label: 'First thing in the morning' },
          { value: 'anytime', label: 'Whenever I can' },
        ],
      },
    ],
    milestones: [{ title: '10 quiet mornings', targetSessions: 10 }],
    habits: (a) => [
      {
        key: 'stillness',
        kind: 'build',
        title: 'Morning stillness',
        icon: 'self-improvement',
        description: 'Sit quietly, breathe, or meditate.',
        version: v({ build: dur(10, 2), timeOfDay: a.time === 'anytime' ? 'anytime' : 'morning', anchor: 'Before checking my phone' }),
      },
      {
        key: 'gratitude',
        kind: 'build',
        title: 'Gratitude note',
        icon: 'edit-note',
        description: 'Write one thing you appreciate.',
        version: v({ build: { trackingType: 'check', target: 1, unit: 'time', minimum: null, minimumLabel: null }, timeOfDay: a.time === 'anytime' ? 'anytime' : 'morning' }),
      },
    ],
  },
  {
    id: 'movement',
    title: 'Movement foundation',
    focusArea: 'health',
    icon: 'directions-walk',
    summary: 'Daily mobility plus a few walks or cardio sessions each week.',
    goalTitle: 'Improve physical health',
    commitmentTitle: 'Build a movement foundation',
    durationDays: 90,
    questions: [
      {
        id: 'activity',
        label: 'How active are you right now?',
        options: [
          { value: 'low', label: 'Mostly sitting' },
          { value: 'some', label: 'Somewhat active' },
          { value: 'active', label: 'Regularly active' },
        ],
      },
    ],
    milestones: [{ title: '12 walks or cardio sessions', targetSessions: 12 }],
    habits: (a) => [
      {
        key: 'mobility',
        kind: 'build',
        title: 'Morning mobility',
        icon: 'accessibility-new',
        description: 'Gentle stretches for hips, back and shoulders.',
        version: v({ build: dur(a.activity === 'low' ? 5 : 10, 3), timeOfDay: 'morning' }),
      },
      {
        key: 'cardio',
        kind: 'build',
        title: 'Walk or cardio',
        icon: 'directions-run',
        description: 'Any pace that lets you still hold a conversation.',
        version: v({
          schedule: { type: 'flexWeekly', timesPerWeek: a.activity === 'active' ? 4 : 3 },
          build: dur(a.activity === 'low' ? 20 : 30, 10),
          timeOfDay: 'anytime',
        }),
      },
    ],
  },
  {
    id: 'social-media',
    title: 'Less social media scrolling',
    focusArea: 'focus',
    icon: 'smartphone',
    summary: 'Step down your daily scrolling time gradually, noticing what triggers it.',
    goalTitle: 'Reclaim my attention',
    commitmentTitle: 'Scroll less, notice more',
    durationDays: 30,
    questions: [
      {
        id: 'baseline',
        label: 'About how many minutes a day do you spend scrolling now?',
        options: [
          { value: '60', label: 'About 1 hour' },
          { value: '90', label: 'About 1.5 hours' },
          { value: '120', label: '2 hours or more' },
        ],
      },
      {
        id: 'target',
        label: 'Where would you like to get to?',
        options: [
          { value: '15', label: '15 minutes' },
          { value: '30', label: '30 minutes' },
          { value: '45', label: '45 minutes' },
        ],
      },
    ],
    milestones: [],
    habits: (a) => {
      const baseline = Number(a.baseline ?? 90);
      const finalTarget = Math.min(Number(a.target ?? 30), baseline);
      const firstStep = Math.max(finalTarget, Math.round(baseline * 0.8));
      return [
        {
          key: 'scroll',
          kind: 'reduce',
          title: 'Social media scrolling',
          icon: 'smartphone',
          description: 'Log a rough estimate of minutes each evening.',
          version: v({
            reduce: {
              mode: 'taper',
              unit: 'min',
              baseline,
              limit: firstStep,
              finalTarget,
              triggers: ['Boredom', 'Evening fatigue', 'Seeking distraction', 'Stress'],
              sensitive: false,
            },
            timeOfDay: 'evening',
          }),
        },
      ];
    },
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Creates (or reuses) a goal, a DRAFT commitment and its habits from a template.
 * The user reviews it on the commitment review screen before starting.
 */
export function applyTemplate(
  templateId: string,
  opts: {
    answers: Record<string, string>;
    goalId?: ID | null;
    startDate: ISODate;
    durationDays?: number | null;
    includedKeys?: string[];
  },
): ID {
  const t = getTemplate(templateId);
  if (!t) throw new Error(`Unknown template ${templateId}`);
  const goalId = opts.goalId ?? createGoal({ title: t.goalTitle, focusArea: t.focusArea, myWhy: null, desiredOutcome: null });
  const commitmentId = createCommitment({
    goalId,
    title: t.commitmentTitle,
    startDate: opts.startDate,
    durationDays: opts.durationDays === undefined ? t.durationDays : opts.durationDays,
    templateId: t.id,
  });
  for (const h of t.habits(opts.answers)) {
    const included = opts.includedKeys ? opts.includedKeys.includes(h.key) : !h.optional;
    if (!included) continue;
    createHabit({
      kind: h.kind,
      title: h.title,
      icon: h.icon,
      goalId,
      commitmentId,
      startDate: opts.startDate,
      version: h.version,
    });
  }
  for (const m of t.milestones) {
    addMilestone({ ownerType: 'commitment', ownerId: commitmentId, title: m.title, targetSessions: m.targetSessions });
  }
  return commitmentId;
}
