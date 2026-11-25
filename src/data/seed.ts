import { addDays, todayISO, weekdayIndex } from '@/domain/dates';
import { emptyUserData } from '@/domain/types';

import {
  addException,
  createCommitment,
  createGoal,
  createHabit,
  rateAutomaticity,
  saveCheckIn,
  saveReflection,
  setLog,
  updateGoal,
} from './actions';
import { useStore } from './store';
import { applyTemplate } from './templates';

/**
 * Development-only sample data: an "Improve my English" commitment ~18 days in,
 * a standalone reduction habit, a flexible weekly habit and a few check-ins.
 * Deterministic pseudo-random so screenshots are stable.
 */
export function loadSampleData(): void {
  // Replace current data (keep settings).
  const settings = useStore.getState().data.settings;
  useStore.getState().replaceData({ ...emptyUserData(), settings });

  const today = todayISO();
  const start = addDays(today, -18);
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Habits + goal from the English template, and a 30-day commitment on them.
  const englishIds = applyTemplate('english', {
    answers: { level: 'intermediate', focus: 'speaking' },
    startDate: start,
  });
  const data = () => useStore.getState().data;
  const englishGoal = data().habits.find((h) => h.id === englishIds[0])?.goalIds[0];
  if (englishGoal) {
    updateGoal(englishGoal, {
      myWhy: 'I want to speak more confidently at work and connect with people.',
      desiredOutcome: 'Lead a team meeting in English with ease',
    });
  }
  const commitmentId = createCommitment({ goalId: null, title: '30-day commitment', startDate: start, durationDays: 30, habitIds: englishIds });
  // Activate in place: startCommitment would move a past start date to today.
  useStore.getState().mutate((d) => ({ commitments: d.commitments.map((c) => (c.id === commitmentId ? { ...c, status: 'active' as const } : c)) }));
  const commitment = data().commitments.find((c) => c.id === commitmentId)!;
  addException({ habitId: null, commitmentId, start: addDays(start, 8), end: addDays(start, 9), kind: 'travel', note: 'Conference trip' });

  // Standalone habits.
  const healthGoal = createGoal({ title: 'Improve physical health', focusArea: 'health', myWhy: null, desiredOutcome: null });
  const meditation = createHabit({
    kind: 'build',
    title: 'Morning meditation',
    icon: 'self-improvement',
    goalIds: [],
    startDate: start,
    version: {
      schedule: { type: 'daily' },
      build: { trackingType: 'duration', target: 5, unit: 'min', minimum: 2, minimumLabel: 'Three slow breaths' },
      reduce: null,
      timeOfDay: 'morning',
      reminderTime: null,
      anchor: 'Before checking my phone',
    },
  });
  const walk = createHabit({
    kind: 'build',
    title: 'Walk or cardio',
    icon: 'directions-run',
    goalIds: [healthGoal],
    startDate: start,
    version: {
      schedule: { type: 'flexWeekly', timesPerWeek: 3 },
      build: { trackingType: 'duration', target: 30, unit: 'min', minimum: 10, minimumLabel: null },
      reduce: null,
      timeOfDay: 'anytime',
      reminderTime: null,
      anchor: null,
    },
  });
  const scroll = createHabit({
    kind: 'reduce',
    title: 'Social media scrolling',
    icon: 'smartphone',
    goalIds: [],
    startDate: start,
    version: {
      schedule: { type: 'daily' },
      build: null,
      reduce: { mode: 'taper', unit: 'min', baseline: 90, limit: 45, finalTarget: 30, triggers: ['Boredom', 'Evening fatigue'], sensitive: false },
      timeOfDay: 'evening',
      reminderTime: null,
      anchor: null,
    },
  });

  // Logs for past days (today is left open for logging).
  const habits = data().habits.filter((h) => commitment.habitIds.includes(h.id));
  for (let d = start; d < today; d = addDays(d, 1)) {
    const wd = weekdayIndex(d);
    const travel = d === addDays(start, 8) || d === addDays(start, 9);
    if (wd < 5 && !travel) {
      for (const h of habits) {
        const r = rand();
        if (r < 0.62) setLog(h.id, d, { status: 'full' });
        else if (r < 0.78) setLog(h.id, d, { status: 'minimum', value: 2 });
        else if (r < 0.86) setLog(h.id, d, { status: 'skipped' });
        // else: left unlogged
      }
    }
    const m = rand();
    if (m < 0.7) setLog(meditation, d, { status: 'full' });
    else if (m < 0.85) setLog(meditation, d, { status: 'minimum', value: 2 });
    if (rand() < 0.42) setLog(walk, d, { status: 'full', value: 25 + Math.round(rand() * 15) });
    const amount = Math.round(80 - (30 * (Number(d.slice(8)) % 18)) / 18 + rand() * 20 - 10);
    setLog(scroll, d, { status: 'logged', value: Math.max(10, amount) });
  }

  const speak = habits.find((h) => h.title === 'Practice speaking');
  if (speak) {
    saveReflection({ habitId: speak.id, date: addDays(today, -3), obstacles: ['lowEnergy'], triggers: [], helpNextTime: 'Try the 2-minute voice note', note: 'Long meetings drained me.' });
    saveReflection({ habitId: speak.id, date: addDays(today, -6), obstacles: ['time'], triggers: [], helpNextTime: null, note: null });
    rateAutomaticity(speak.id, 4, addDays(start, 1));
    rateAutomaticity(speak.id, 6, addDays(today, -4));
  }
  saveReflection({ habitId: scroll, date: addDays(today, -2), obstacles: ['urge'], triggers: ['Evening fatigue'], helpNextTime: 'Put the phone in another room after 9', note: null });
  saveCheckIn({ date: addDays(today, -1), disposition: 'steady', energy: 3, stress: 2, sleepHours: '7–8', sleepRestorative: true, note: null });
  saveCheckIn({ date: addDays(today, -2), disposition: 'grounded', energy: 4, stress: 2, sleepHours: '7–8', sleepRestorative: true, note: null });
}
