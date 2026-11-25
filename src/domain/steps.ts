import type { Goal, ISODate, Step } from './types';

export interface DayStep {
  step: Step;
  goal: Goal;
  /** Set when an undone step from an earlier day is carried onto today. */
  from: ISODate | null;
}

/**
 * Steps to show on a day: those dated that day. Today also carries the steps from earlier days
 * that aren't done yet (and keeps them, ticked, for the rest of the day they're done).
 * Steps of a goal you let go are not shown.
 */
export function stepsForDay(steps: Step[], goals: Goal[], day: ISODate, today: ISODate): DayStep[] {
  const live = new Map(goals.filter((g) => g.status !== 'archived').map((g) => [g.id, g]));
  const out: DayStep[] = [];
  for (const step of steps) {
    const goal = live.get(step.goalId);
    if (!goal || !step.date) continue;
    if (step.date === day) out.push({ step, goal, from: null });
    else if (day === today && step.date < today && (!step.doneAt || step.doneAt === today)) out.push({ step, goal, from: step.date });
  }
  return out.sort((a, b) => (a.step.date! < b.step.date! ? -1 : a.step.date! > b.step.date! ? 1 : a.step.createdAt < b.step.createdAt ? -1 : 1));
}

/** Progress of a goal's steps. */
export function stepCounts(steps: Step[], goalId: string): { done: number; total: number } {
  const mine = steps.filter((s) => s.goalId === goalId);
  return { done: mine.filter((s) => s.doneAt).length, total: mine.length };
}

/** Steps done in a period (for reports). */
export function stepsDoneIn(steps: Step[], start: ISODate, end: ISODate): number {
  return steps.filter((s) => s.doneAt && s.doneAt >= start && s.doneAt <= end).length;
}
