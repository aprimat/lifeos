import { commitmentProgress, dailySeries, habitsBreakdown, newlyReachedMilestones, reduceTrend } from './analytics';
import { addDays, startOfMonth } from './dates';
import { makeCommitment, makeHabit, makeLog, makeReduceHabit } from './fixtures';
import { buildIndex } from './schedule';
import { generateSuggestions } from './suggestions';
import type { ActivityLog } from './types';

/** Plan 11.3: a year of history for several habits stays fast enough for every render. */
describe('performance with 365 days of logs', () => {
  const start = '2025-11-23';
  const today = '2026-11-23';
  const c = makeCommitment({ startDate: start, durationDays: null });
  const habits = [
    makeHabit({ startDate: start }),
    makeHabit({ startDate: start }, { effectiveFrom: start, schedule: { type: 'weekdays', weekdays: [0, 2, 4] } }),
    makeHabit({ startDate: start }, { effectiveFrom: start, schedule: { type: 'flexWeekly', timesPerWeek: 3 } }),
    makeHabit({ startDate: start }, { effectiveFrom: start }),
    makeHabit({ startDate: start }, { effectiveFrom: start }),
    makeReduceHabit({ startDate: start }),
  ];
  c.habitIds = [habits[0].id, habits[1].id];
  for (const h of habits) h.versions[0].effectiveFrom = start;
  const logs: ActivityLog[] = [];
  for (let d = start; d < today; d = addDays(d, 1)) {
    habits.forEach((h, k) => {
      if ((d.charCodeAt(9) + k) % 5 === 0) return;
      logs.push(h.kind === 'reduce' ? makeLog(h.id, d, 'logged', 20 + k) : makeLog(h.id, d, k % 3 === 0 ? 'minimum' : 'full'));
    });
  }

  it('computes the Progress screen for a year of data quickly', () => {
    const t0 = Date.now();
    const idx = buildIndex({ habits, commitments: [c], logs, exceptions: [] });
    habitsBreakdown(habits, addDays(today, -27), today, idx, today);
    habitsBreakdown(habits, startOfMonth(today), today, idx, today);
    dailySeries(habits, addDays(today, -6), today, idx, today);
    commitmentProgress(c, habits, idx, today);
    reduceTrend(habits[5], today, 28, idx);
    generateSuggestions({ habits, reflections: [], automaticity: [], idx, today });
    newlyReachedMilestones([], [c], habits, idx, today);
    const ms = Date.now() - t0;
    expect(logs.length).toBeGreaterThan(1500);
    expect(ms).toBeLessThan(1500);
  });
});
