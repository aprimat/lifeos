import { stepCounts, stepsDoneIn, stepsForDay } from './steps';
import type { Goal, Step } from './types';

const today = '2026-11-25';
const goal = (id: string, status: Goal['status'] = 'active'): Goal =>
  ({ id, title: id, focusArea: null, myWhy: null, desiredOutcome: null, status, createdAt: '2026-11-01T00:00:00Z', updatedAt: '' }) as Goal;
let n = 0;
const step = (goalId: string, date: string | null, doneAt: string | null = null): Step => ({
  id: `s${++n}`,
  goalId,
  title: `Step ${n}`,
  date,
  doneAt,
  minutes: null,
  createdAt: `2026-11-01T00:00:0${n % 10}Z`,
  updatedAt: '',
});

test('a day shows its own steps; today also carries undone ones from earlier', () => {
  const goals = [goal('job'), goal('old', 'archived')];
  const onToday = step('job', today);
  const overdue = step('job', '2026-11-23');
  const overdueDoneToday = step('job', '2026-11-22', today);
  const overdueDoneBefore = step('job', '2026-11-21', '2026-11-24');
  const tomorrow = step('job', '2026-11-26');
  const undated = step('job', null);
  const letGo = step('old', today);
  const all = [onToday, overdue, overdueDoneToday, overdueDoneBefore, tomorrow, undated, letGo];

  const t = stepsForDay(all, goals, today, today);
  expect(t.map((x) => x.step.id)).toEqual([overdueDoneToday.id, overdue.id, onToday.id]);
  expect(t.find((x) => x.step.id === overdue.id)!.from).toBe('2026-11-23');
  expect(t.find((x) => x.step.id === onToday.id)!.from).toBeNull();

  // A past day shows only what was dated that day; a future day only its own.
  expect(stepsForDay(all, goals, '2026-11-23', today).map((x) => x.step.id)).toEqual([overdue.id]);
  expect(stepsForDay(all, goals, '2026-11-26', today).map((x) => x.step.id)).toEqual([tomorrow.id]);
});

test('counts steps per goal and in a period', () => {
  const steps = [step('a', null, '2026-11-02'), step('a', '2026-11-20'), step('b', null, '2026-10-30')];
  expect(stepCounts(steps, 'a')).toEqual({ done: 1, total: 2 });
  expect(stepsDoneIn(steps, '2026-11-01', '2026-11-30')).toBe(1);
});
