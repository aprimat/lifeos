import type { Disposition, ExceptionKind, FocusArea, Obstacle, ReduceMode, TimeOfDay } from '@/domain/types';

/**
 * User-facing strings shared across screens. Tone rules (IMPLEMENTATION_PLAN.md §3.3):
 * calm, plain wording; no streaks, no guilt, no invented science, no pressure from "My Why".
 */

export const FOCUS_AREAS: { value: FocusArea; label: string; icon: string; description: string }[] = [
  { value: 'learning', label: 'Learning', icon: 'menu-book', description: 'Reading, languages and building skills.' },
  { value: 'health', label: 'Health', icon: 'favorite-border', description: 'Movement, food, sleep and energy.' },
  { value: 'focus', label: 'Focus', icon: 'center-focus-strong', description: 'Deep work and less reactive noise.' },
  { value: 'wellbeing', label: 'Well-being', icon: 'self-improvement', description: 'Calm, rest and emotional balance.' },
  { value: 'relationships', label: 'Relationships', icon: 'groups', description: 'Time and attention for people who matter.' },
  { value: 'growth', label: 'Personal growth', icon: 'spa', description: 'Reflection, clarity and direction.' },
];

export const focusLabel = (f: FocusArea | null | undefined) => FOCUS_AREAS.find((x) => x.value === f)?.label ?? '';

export const TIME_OF_DAY: { value: TimeOfDay; label: string; icon: string }[] = [
  { value: 'morning', label: 'Morning', icon: 'wb-sunny' },
  { value: 'afternoon', label: 'Afternoon', icon: 'light-mode' },
  { value: 'evening', label: 'Evening', icon: 'nights-stay' },
  { value: 'anytime', label: 'Anytime', icon: 'all-inclusive' },
];

export const OBSTACLES: { value: Obstacle; label: string; hint: string; icon: string }[] = [
  { value: 'time', label: 'Not enough time', hint: 'The day got full', icon: 'schedule' },
  { value: 'forgot', label: 'Forgot', hint: 'Routine was disrupted', icon: 'notifications-off' },
  { value: 'lowEnergy', label: 'Low energy', hint: 'Tired or depleted', icon: 'battery-alert' },
  { value: 'difficult', label: 'Too difficult', hint: 'Needed a smaller step', icon: 'help-outline' },
  { value: 'motivation', label: 'Motivation', hint: "Didn't feel like it", icon: 'sentiment-neutral' },
  { value: 'unexpected', label: 'Unexpected event', hint: 'Something came up', icon: 'bolt' },
  { value: 'urge', label: 'Trigger or urge', hint: 'A familiar pull', icon: 'waves' },
  { value: 'other', label: 'Other', hint: 'Not the right moment', icon: 'more-horiz' },
];

export const HELP_IDEAS = [
  'Try the minimum version',
  'Move it to another time',
  'Add a reminder',
  'Prepare the night before',
  'Plan an alternative',
];

export const DEFAULT_TRIGGERS = ['Boredom', 'Stress', 'Evening fatigue', 'Seeking distraction', 'Social situation', 'Habitual reflex'];

export const DISPOSITIONS: { value: Disposition; label: string; hint: string; icon: string }[] = [
  { value: 'grounded', label: 'Grounded', hint: 'Calm and centred', icon: 'spa' },
  { value: 'energized', label: 'Energized', hint: 'Clear and sharp', icon: 'wb-sunny' },
  { value: 'steady', label: 'Steady', hint: 'Neutral baseline', icon: 'horizontal-rule' },
  { value: 'restless', label: 'Restless', hint: 'Scattered focus', icon: 'air' },
  { value: 'depleted', label: 'Depleted', hint: 'Low reserves', icon: 'battery-1-bar' },
];

export const EXCEPTION_KINDS: { value: ExceptionKind; label: string; icon: string }[] = [
  { value: 'rest', label: 'Rest day', icon: 'spa' },
  { value: 'travel', label: 'Travel', icon: 'flight' },
  { value: 'holiday', label: 'Holiday', icon: 'celebration' },
  { value: 'busy', label: 'Busy day', icon: 'event-busy' },
];

export const REDUCE_MODES: { value: ReduceMode; label: string; description: string }[] = [
  { value: 'avoid', label: 'Avoid entirely', description: 'Aim for zero on scheduled days.' },
  { value: 'limit', label: 'Stay below a limit', description: 'Keep it under a daily amount.' },
  { value: 'taper', label: 'Gradually reduce', description: 'Step down from where you are now toward a target.' },
];

export const DURATION_PRESETS = [
  { days: 30, label: '30 days', hint: 'Build momentum' },
  { days: 60, label: '60 days', hint: 'Deepen the habit' },
  { days: 90, label: '90 days', hint: 'Lasting change' },
];

/** Safety guidance for sensitive reduction goals (IMPLEMENTATION_PLAN.md §5). */
export const SAFETY = {
  title: "LifeOS isn't treatment",
  intro:
    "LifeOS can help you notice patterns and work toward your own goals. It isn't medical advice or addiction treatment.",
  alcohol:
    'If you drink alcohol heavily or every day, stopping suddenly can be dangerous. Please talk to a doctor or pharmacist before you cut down, and consider reducing gradually with their help.',
  support: (behavior: string) =>
    `If you feel you can't control ${behavior || 'this behaviour'}, or it is affecting your health, work or relationships, support is available: a doctor, a pharmacist or a local support service can help.`,
  crisis: 'If you are in crisis or might be in danger, contact your local emergency number now.',
  acknowledge: 'I understand',
};

export const ENCOURAGEMENT = [
  'Small steps count.',
  'Showing up is the point.',
  'Steady beats intense.',
  'A missed day is information, not failure.',
  'Every return to the practice counts.',
];

export function greeting(name: string, hour = new Date().getHours()) {
  const first = name.split(' ')[0] ?? '';
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return first ? `${part}, ${first}` : part;
}
