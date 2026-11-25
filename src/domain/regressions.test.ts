import { commitmentProgress } from './analytics';
import { makeCommitment, makeHabit, makeLog } from './fixtures';
import { buildIndex, canRescheduleTo, isHabitActiveOn, occurrence, statusForValue } from './schedule';
import type { ActivityLog, Commitment, Habit } from './types';

const idx = (habits: Habit[], logs: ActivityLog[] = [], commitments: Commitment[] = []) =>
  buildIndex({ habits, commitments, logs, exceptions: [] });

describe('review fixes (domain)', () => {
  it("counts a commitment's final, partial flexible week", () => {
    // 30 days from Mon Nov 2 ends Tue Dec 1.
    const c = makeCommitment({ startDate: '2026-11-02', durationDays: 30 });
    const h = makeHabit({}, { schedule: { type: 'flexWeekly', timesPerWeek: 2 } });
    c.habitIds = [h.id];
    const logs = [makeLog(h.id, '2026-11-30', 'full'), makeLog(h.id, '2026-12-01', 'full')];
    const p = commitmentProgress(c, [h], idx([h], logs, [c]), '2026-12-03');
    expect(p.breakdown.done).toBe(2);
  });

  it('keeps the archive day itself in history', () => {
    const h = makeHabit({ status: 'archived', archivedAt: '2026-11-10' });
    const i = idx([h], [makeLog(h.id, '2026-11-10', 'full')]);
    expect(occurrence(h, '2026-11-10', i, '2026-11-12').status).toBe('full');
    expect(isHabitActiveOn(h, '2026-11-11', i)).toBe(false);
  });

  it('only calls an amount "minimum" when it is the minimum', () => {
    const build = { trackingType: 'duration' as const, target: 20, unit: 'min', minimum: 10, minimumLabel: null };
    expect(statusForValue(build, 10)).toBe('minimum');
    expect(statusForValue(build, 1)).toBe('partial');
    expect(statusForValue(build, 15)).toBe('partial');
  });

  it("doesn't offer moving a session onto a day that's already scheduled", () => {
    const daily = makeHabit();
    expect(canRescheduleTo(daily, '2026-11-11', idx([daily]))).toBe(false);
    const weekdays = makeHabit({}, { schedule: { type: 'weekdays', weekdays: [0, 2, 4] } });
    // 2026-11-10 is a Tuesday (free), 2026-11-11 a Wednesday (scheduled).
    expect(canRescheduleTo(weekdays, '2026-11-10', idx([weekdays]))).toBe(true);
    expect(canRescheduleTo(weekdays, '2026-11-11', idx([weekdays]))).toBe(false);
  });
});
