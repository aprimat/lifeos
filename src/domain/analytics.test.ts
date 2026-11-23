import {
  commitmentProgress,
  consistency,
  dailyCompletion,
  flexWeek,
  flexibleForDay,
  habitBreakdown,
  newlyReachedMilestones,
  reduceTrend,
} from './analytics';
import { addDays, diffDays, endOfMonth, startOfWeek, weekdayIndex } from './dates';
import { makeCommitment, makeException, makeHabit, makeLog, makeReduceHabit, makeVersion } from './fixtures';
import { buildIndex, occurrence, statusForValue } from './schedule';
import { generateSuggestions } from './suggestions';
import type { ActivityLog, Commitment, Habit, ScheduleException } from './types';

const idx = (
  habits: Habit[],
  logs: ActivityLog[] = [],
  exceptions: ScheduleException[] = [],
  commitments: Commitment[] = [],
) => buildIndex({ habits, logs, exceptions, commitments });

describe('dates', () => {
  it('uses Monday as the first weekday', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0);
    expect(weekdayIndex('2026-11-22')).toBe(6);
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
  });
  it('handles month ends and day differences', () => {
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(diffDays('2026-11-02', '2026-11-22')).toBe(20);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('occurrence status', () => {
  const today = '2026-11-12';

  it('does not count a planned exception as an opportunity', () => {
    const h = makeHabit();
    const i = idx([h], [], [makeException({ habitId: h.id, start: '2026-11-10', end: '2026-11-10' })]);
    const o = occurrence(h, '2026-11-10', i, today);
    expect(o.status).toBe('rest');
    expect(o.eligible).toBe(false);
  });

  it('marks a past unlogged day as missed (computed, not stored)', () => {
    const h = makeHabit();
    const o = occurrence(h, '2026-11-05', idx([h]), today);
    expect(o.status).toBe('missed');
    expect(o.eligible).toBe(true);
    expect(o.done).toBe(false);
  });

  it('keeps today upcoming until logged', () => {
    const h = makeHabit();
    expect(occurrence(h, today, idx([h]), today).status).toBe('upcoming');
    expect(occurrence(h, today, idx([h]), today).eligible).toBe(false);
  });

  it('moves the opportunity when rescheduled', () => {
    const h = makeHabit({}, { schedule: { type: 'weekdays', weekdays: [0, 2, 4] } }); // Mon Wed Fri
    const logs = [makeLog(h.id, '2026-11-02', 'rescheduled', null, { rescheduledTo: '2026-11-03' })];
    const i = idx([h], logs);
    expect(occurrence(h, '2026-11-02', i, today).eligible).toBe(false);
    expect(occurrence(h, '2026-11-03', i, today).status).toBe('missed'); // Tuesday now planned
  });

  it('counts minimum and partial as done but skipped as not done', () => {
    const h = makeHabit();
    const logs = [
      makeLog(h.id, '2026-11-02', 'full'),
      makeLog(h.id, '2026-11-03', 'minimum'),
      makeLog(h.id, '2026-11-04', 'partial', 5),
      makeLog(h.id, '2026-11-05', 'skipped'),
    ];
    const b = habitBreakdown(h, '2026-11-02', '2026-11-05', idx([h], logs), today);
    expect(b).toMatchObject({ eligible: 4, done: 3, full: 1, minimum: 1, partial: 1, skipped: 1 });
    expect(consistency(b)).toBeCloseTo(0.75);
  });

  it('never changes past days when a habit is edited', () => {
    const h = makeHabit({}, { schedule: { type: 'daily' } });
    h.versions.push(makeVersion({ effectiveFrom: '2026-11-09', schedule: { type: 'weekdays', weekdays: [0] } }));
    const i = idx([h]);
    expect(occurrence(h, '2026-11-04', i, today).eligible).toBe(true); // Wed, under the old daily schedule
    expect(occurrence(h, '2026-11-11', i, today).planned).toBe(false); // Wed, under the new Monday-only schedule
  });

  it('ignores paused commitment days', () => {
    const c = makeCommitment({ pauses: [{ start: '2026-11-05', end: '2026-11-07' }] });
    const h = makeHabit({ commitmentId: c.id });
    const b = habitBreakdown(h, '2026-11-02', '2026-11-08', idx([h], [], [], [c]), today);
    expect(b.eligible).toBe(4);
  });

  it('derives full/minimum/partial from an entered value', () => {
    const build = { trackingType: 'duration' as const, target: 10, unit: 'min', minimum: 2, minimumLabel: null };
    expect(statusForValue(build, 10)).toBe('full');
    expect(statusForValue(build, 2)).toBe('minimum');
    expect(statusForValue(build, 6)).toBe('partial');
  });
});

describe('flexible weekly habits', () => {
  const flex = () => makeHabit({}, { schedule: { type: 'flexWeekly', timesPerWeek: 3 } });

  it('is not counted as missed while the week is in progress', () => {
    const h = flex();
    const i = idx([h], [makeLog(h.id, '2026-11-02', 'full')]);
    const w = flexWeek(h, '2026-11-04', i, '2026-11-04');
    expect(w).toMatchObject({ target: 3, done: 1, missed: 0, ended: false });
    expect(w.breakdown.eligible).toBe(1);
  });

  it('counts unmet sessions as missed after the week ends, with extras capped', () => {
    const h = flex();
    const i = idx([h], [makeLog(h.id, '2026-11-02', 'full')]);
    expect(flexWeek(h, '2026-11-02', i, '2026-11-10')).toMatchObject({ done: 1, missed: 2 });
    const many = idx([h], ['02', '03', '04', '05'].map((d) => makeLog(h.id, `2026-11-${d}`, 'full')));
    expect(flexWeek(h, '2026-11-02', many, '2026-11-10')).toMatchObject({ done: 3, extra: 1, missed: 0 });
  });

  it('lowers the target in a partial first week', () => {
    const h = makeHabit({ startDate: '2026-11-07' }, { schedule: { type: 'flexWeekly', timesPerWeek: 4 } });
    expect(flexWeek(h, '2026-11-07', idx([h]), '2026-11-20').target).toBe(2); // Sat + Sun only
  });

  it('is excluded from the daily denominator', () => {
    const daily = makeHabit();
    const h = flex();
    const i = idx([daily, h]);
    expect(dailyCompletion([daily, h], '2026-11-04', i, '2026-11-04').total).toBe(1);
    expect(flexibleForDay([daily, h], '2026-11-04', i, '2026-11-04')).toHaveLength(1);
  });
});

describe('reduce habits', () => {
  const today = '2026-11-09';
  it('separates within-limit, over-limit and not-logged days', () => {
    const h = makeReduceHabit();
    const logs = [makeLog(h.id, '2026-11-02', 'logged', 20), makeLog(h.id, '2026-11-03', 'logged', 45)];
    const b = habitBreakdown(h, '2026-11-02', '2026-11-04', idx([h], logs), today);
    expect(b).toMatchObject({ eligible: 3, done: 1, within: 1, over: 1, notLogged: 1 });
  });

  it('compares the 7-day average to the baseline', () => {
    const h = makeReduceHabit({}, 30, 90);
    const logs = [makeLog(h.id, '2026-11-07', 'logged', 30), makeLog(h.id, '2026-11-08', 'logged', 60)];
    const t = reduceTrend(h, '2026-11-08', 7, idx([h], logs));
    expect(t.average).toBe(45);
    expect(t.changeVsBaseline).toBeCloseTo(-0.5);
    expect(t.loggedDays).toBe(2);
  });
});

describe('commitment progress', () => {
  it('reports day number, planned sessions and consistency', () => {
    const c = makeCommitment({ durationDays: 14 });
    const h = makeHabit({ commitmentId: c.id }, { schedule: { type: 'weekdays', weekdays: [0, 1, 2, 3, 4] } });
    const ex = makeException({ commitmentId: c.id, start: '2026-11-04', end: '2026-11-04' });
    const logs = [makeLog(h.id, '2026-11-02', 'full'), makeLog(h.id, '2026-11-03', 'full', 12)];
    const p = commitmentProgress(c, [h], idx([h], logs, [ex], [c]), '2026-11-06');
    expect(p.day).toBe(5);
    expect(p.daysRemaining).toBe(9);
    expect(p.plannedTotal).toBe(9); // 10 weekdays minus one exception
    expect(p.breakdown).toMatchObject({ eligible: 3, done: 2 }); // Mon, Tue, Thu (Fri is today)
    expect(p.minutes).toBe(22);
  });
});

describe('suggestions', () => {
  it('suggests a pause after three missed sessions in a row, and nothing is auto-applied', () => {
    const h = makeHabit();
    const s = generateSuggestions({ habits: [h], reflections: [], automaticity: [], idx: idx([h]), today: '2026-11-08' });
    expect(s.map((x) => x.rule)).toEqual(['S3']);
    expect(h.versions).toHaveLength(1);
  });

  it('suggests a lighter target when most sessions are the minimum version', () => {
    const h = makeHabit();
    const logs = ['02', '03', '04', '05', '06'].map((d, k) => makeLog(h.id, `2026-11-${d}`, k === 0 ? 'full' : 'minimum'));
    const s = generateSuggestions({ habits: [h], reflections: [], automaticity: [], idx: idx([h], logs), today: '2026-11-07' });
    expect(s.find((x) => x.rule === 'S2')?.change).toEqual({ kind: 'target', from: 10, to: 5, unit: 'min' });
  });

  it('offers an optional increase only when steady and easy', () => {
    const h = makeHabit();
    const logs = Array.from({ length: 10 }, (_, k) => makeLog(h.id, addDays('2026-11-02', k), 'full'));
    const s = generateSuggestions({ habits: [h], reflections: [], automaticity: [], idx: idx([h], logs), today: '2026-11-12' });
    expect(s.map((x) => x.rule)).toEqual(['S4']);
  });
});

describe('milestones', () => {
  it('records the day the Nth session was done, in target order', () => {
    const c = makeCommitment({ durationDays: 30 });
    const h = makeHabit({ commitmentId: c.id });
    const logs = ['02', '03', '04', '05', '06'].map((d, k) => makeLog(h.id, `2026-11-${d}`, k === 1 ? 'skipped' : 'full'));
    const stamp = '2026-01-01T00:00:00.000Z';
    const ms = [
      { id: 'm4', createdAt: stamp, updatedAt: stamp, ownerType: 'commitment' as const, ownerId: c.id, title: '4', targetSessions: 4, targetDate: null, achievedAt: null },
      { id: 'm2', createdAt: stamp, updatedAt: stamp, ownerType: 'commitment' as const, ownerId: c.id, title: '2', targetSessions: 2, targetDate: null, achievedAt: null },
      { id: 'm9', createdAt: stamp, updatedAt: stamp, ownerType: 'commitment' as const, ownerId: c.id, title: '9', targetSessions: 9, targetDate: null, achievedAt: null },
    ];
    const r = newlyReachedMilestones(ms, [c], [h], idx([h], logs, [], [c]), '2026-11-10');
    expect(r).toEqual([
      { id: 'm2', date: '2026-11-04' }, // skip on the 3rd doesn't count
      { id: 'm4', date: '2026-11-06' },
    ]);
  });
});
