import { makeHabit, makeLog } from './fixtures';
import { periodReport } from './report';
import { buildIndex } from './schedule';
import type { ActivityLog, Habit } from './types';

const idx = (habits: Habit[], logs: ActivityLog[] = []) => buildIndex({ habits, logs, exceptions: [], commitments: [] });
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => `2026-11-${String(from + k).padStart(2, '0')}`);

describe('period report', () => {
  it('leads with the best habit and picks one to adjust', () => {
    const good = makeHabit({ title: 'Walk' });
    const weak = makeHabit({ title: 'Read' });
    const logs = [
      ...days(2, 8).map((d) => makeLog(good.id, d, 'full')),
      makeLog(weak.id, '2026-11-02', 'minimum'),
      makeLog(weak.id, '2026-11-03', 'skipped'),
    ];
    const r = periodReport([weak, good], '2026-11-02', '2026-11-08', idx([good, weak], logs), '2026-11-20');
    expect(r.habits.map((h) => h.habit.title)).toEqual(['Walk', 'Read']);
    expect(r.best?.habit.title).toBe('Walk');
    expect(r.adjust?.habit.title).toBe('Read');
    expect(r.breakdown).toMatchObject({ eligible: 14, done: 8, minimum: 1 });
    expect(r.minutes).toBe(7 * 10 + 2); // seven full sessions of 10 min + one 2-min minimum
  });

  it('stops at today, compares with an earlier period and skips habits with nothing planned', () => {
    const h = makeHabit();
    const later = makeHabit({ startDate: '2026-12-01' });
    const logs = [...days(2, 8).map((d) => makeLog(h.id, d, 'full')), ...days(9, 10).map((d) => makeLog(h.id, d, 'full'))];
    const r = periodReport([h, later], '2026-11-09', '2026-11-15', idx([h, later], logs), '2026-11-12', {
      compareTo: { start: '2026-11-02', end: '2026-11-08' },
    });
    expect(r.end).toBe('2026-11-12');
    expect(r.breakdown).toMatchObject({ eligible: 3, done: 2 });
    expect(r.previousConsistency).toBe(1);
    expect(r.habits).toHaveLength(1);
  });

  it('has no best or adjust when there is too little to go on', () => {
    const h = makeHabit({ startDate: '2026-11-07' });
    const r = periodReport([h], '2026-11-02', '2026-11-08', idx([h]), '2026-11-20');
    expect(r.best).toBeNull();
    expect(r.adjust).toBeNull();
  });
});
