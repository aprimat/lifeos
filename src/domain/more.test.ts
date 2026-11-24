import {
  commitmentProgress,
  dailySeries,
  flexWeek,
  habitBreakdown,
  minutesInRange,
  pct,
} from './analytics';
import {
  dayOfMonth,
  eachDay,
  formatLong,
  formatMonth,
  formatRange,
  formatShort,
  formatTime,
  inRange,
  maxDate,
  minutesLabel,
  startOfMonth,
  weekdayLetter,
  weekdayShort,
} from './dates';
import { makeCommitment, makeException, makeHabit, makeLog, makeReduceHabit, makeVersion } from './fixtures';
import {
  buildIndex,
  commitmentDay,
  commitmentEndDate,
  currentVersion,
  isAlcohol,
  isFlexible,
  isSensitiveBehavior,
  logAmount,
  occurrence,
} from './schedule';
import { generateSuggestions } from './suggestions';
import type { ActivityLog, Commitment, Habit, Reflection, ScheduleException } from './types';

const idx = (habits: Habit[], logs: ActivityLog[] = [], exceptions: ScheduleException[] = [], commitments: Commitment[] = []) =>
  buildIndex({ habits, logs, exceptions, commitments });

const stamp = '2026-01-01T00:00:00.000Z';
const reflection = (habitId: string, date: string, patch: Partial<Reflection>): Reflection => ({
  id: `${habitId}-${date}`,
  createdAt: stamp,
  updatedAt: stamp,
  habitId,
  date,
  obstacles: [],
  triggers: [],
  helpNextTime: null,
  note: null,
  ...patch,
});

describe('date formatting', () => {
  it('formats dates, ranges, times and minutes for display', () => {
    expect(formatShort('2026-11-02')).toBe('Nov 2');
    expect(formatLong('2026-11-02')).toBe('Monday, November 2');
    expect(formatMonth('2026-11-02')).toBe('November 2026');
    expect(formatRange('2026-11-02', '2026-11-02')).toBe('Nov 2');
    expect(formatRange('2026-11-02', '2026-11-08')).toBe('Nov 2 – Nov 8');
    expect(formatTime('08:15')).toBe('8:15 AM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('21:30')).toBe('9:30 PM');
    expect(minutesLabel(45)).toBe('45 min');
    expect(minutesLabel(60)).toBe('1h');
    expect(minutesLabel(135)).toBe('2h 15m');
    expect(weekdayShort(0)).toBe('Mon');
    expect(weekdayLetter(6)).toBe('S');
    expect(dayOfMonth('2026-11-09')).toBe(9);
    expect(startOfMonth('2026-11-19')).toBe('2026-11-01');
  });

  it('handles ranges and comparisons', () => {
    expect(eachDay('2026-11-03', '2026-11-01')).toEqual([]);
    expect(eachDay('2026-11-01', '2026-11-03')).toHaveLength(3);
    expect(maxDate('2026-11-01', '2026-11-03')).toBe('2026-11-03');
    expect(inRange('2026-11-05', '2026-11-01', null)).toBe(true);
    expect(inRange('2026-10-30', '2026-11-01', '2026-11-03')).toBe(false);
  });
});

describe('schedule helpers', () => {
  it('detects sensitive behaviours without false positives on everyday words', () => {
    expect(isSensitiveBehavior('Drinking alcohol')).toBe(true);
    expect(isSensitiveBehavior('Smoking')).toBe(true);
    expect(isSensitiveBehavior('Vaping')).toBe(true);
    expect(isSensitiveBehavior('Online gambling')).toBe(true);
    expect(isSensitiveBehavior('Binge eating')).toBe(true);
    expect(isSensitiveBehavior('Social media scrolling')).toBe(false);
    expect(isSensitiveBehavior('Reduce sugar intake')).toBe(false);
    expect(isSensitiveBehavior('Great repeat sweat')).toBe(false);
    expect(isAlcohol('Wine with dinner')).toBe(true);
    expect(isAlcohol('Smoking')).toBe(false);
  });

  it('computes commitment end dates and day numbers', () => {
    const c = makeCommitment({ startDate: '2026-11-02', durationDays: 30 });
    expect(commitmentEndDate(c)).toBe('2026-12-01');
    expect(commitmentEndDate({ ...c, endedAt: '2026-11-10' })).toBe('2026-11-10');
    expect(commitmentEndDate({ ...c, durationDays: null })).toBeNull();
    expect(commitmentEndDate({ ...c, durationDays: null, endedAt: '2026-11-20' })).toBe('2026-11-20');
    expect(commitmentDay(c, '2026-11-01')).toBe(0);
    expect(commitmentDay(c, '2026-12-20')).toBe(30);
    expect(commitmentDay({ ...c, durationDays: null }, '2026-12-20')).toBe(49);
  });

  it('derives amounts for totals', () => {
    const build = { trackingType: 'duration' as const, target: 10, unit: 'min', minimum: 2, minimumLabel: null };
    expect(logAmount(build, makeLog('h', '2026-11-02', 'full'))).toBe(10);
    expect(logAmount(build, makeLog('h', '2026-11-02', 'minimum'))).toBe(2);
    expect(logAmount(build, makeLog('h', '2026-11-02', 'partial', 6))).toBe(6);
    expect(logAmount(build, makeLog('h', '2026-11-02', 'skipped'))).toBe(0);
    expect(logAmount(null, makeLog('h', '2026-11-02', 'logged', 40))).toBe(40);
  });

  it('treats archived, paused and draft-commitment habits as inactive', () => {
    const archived = makeHabit({ archivedAt: '2026-11-05' });
    const paused = makeHabit({ pauses: [{ start: '2026-11-04', end: null }] });
    const draft = makeCommitment({ status: 'draft' });
    const inDraft = makeHabit({ commitmentId: draft.id });
    const i = idx([archived, paused, inDraft], [], [], [draft]);
    expect(occurrence(archived, '2026-11-06', i, '2026-11-10').status).toBe('none');
    expect(occurrence(paused, '2026-11-08', i, '2026-11-10').status).toBe('none');
    expect(occurrence(inDraft, '2026-11-03', i, '2026-11-10').status).toBe('none');
  });

  it('shows extra logs on unscheduled or rest days without counting them', () => {
    const h = makeHabit({}, { schedule: { type: 'weekdays', weekdays: [0] } });
    const logs = [makeLog(h.id, '2026-11-03', 'full'), makeLog(h.id, '2026-11-09', 'full')];
    const ex = makeException({ habitId: h.id, start: '2026-11-09', end: '2026-11-09' });
    const i = idx([h], logs, [ex]);
    const extra = occurrence(h, '2026-11-03', i, '2026-11-12');
    expect(extra).toMatchObject({ status: 'full', eligible: false, done: true, planned: false });
    expect(occurrence(h, '2026-11-09', i, '2026-11-12')).toMatchObject({ status: 'full', eligible: false });
  });

  it('applies commitment-wide and global exceptions', () => {
    const c = makeCommitment();
    const h = makeHabit({ commitmentId: c.id });
    const global = makeException({ start: '2026-11-04', end: '2026-11-04' });
    const i = idx([h], [], [global], [c]);
    expect(occurrence(h, '2026-11-04', i, '2026-11-10').status).toBe('rest');
  });

  it('supports exact-date schedules and reports flexibility', () => {
    const h = makeHabit({}, { schedule: { type: 'dates', dates: ['2026-11-05'] } });
    const i = idx([h]);
    expect(occurrence(h, '2026-11-05', i, '2026-11-10').status).toBe('missed');
    expect(occurrence(h, '2026-11-06', i, '2026-11-10').status).toBe('none');
    expect(isFlexible(h)).toBe(false);
    expect(isFlexible(makeHabit({}, { schedule: { type: 'flexWeekly', timesPerWeek: 2 } }), '2026-11-05')).toBe(true);
    expect(currentVersion(h).schedule.type).toBe('dates');
  });
});

describe('analytics extras', () => {
  it('formats percentages and avoids a fake 0%', () => {
    expect(pct(null)).toBe('—');
    expect(pct(0.876)).toBe('88%');
  });

  it('sums minutes only for duration habits and real sessions', () => {
    const h = makeHabit();
    const q = makeHabit({}, { build: { trackingType: 'quantity', target: 5, unit: 'words', minimum: null, minimumLabel: null } });
    const r = makeReduceHabit();
    const logs = [
      makeLog(h.id, '2026-11-02', 'full'),
      makeLog(h.id, '2026-11-03', 'partial', 4),
      makeLog(h.id, '2026-11-04', 'skipped'),
      makeLog(q.id, '2026-11-02', 'full'),
      makeLog(r.id, '2026-11-02', 'logged', 50),
    ];
    expect(minutesInRange([h, q, r], '2026-11-01', '2026-11-30', idx([h, q, r], logs))).toBe(14);
  });

  it('builds a per-day series with rest and future days marked', () => {
    const h = makeHabit();
    const ex = makeException({ habitId: h.id, start: '2026-11-03', end: '2026-11-03' });
    const i = idx([h], [makeLog(h.id, '2026-11-02', 'full')], [ex]);
    const s = dailySeries([h], '2026-11-02', '2026-11-05', i, '2026-11-04');
    expect(s[0]).toMatchObject({ planned: 1, done: 1, rest: false });
    expect(s[1]).toMatchObject({ planned: 0, rest: true });
    expect(s[3].future).toBe(true);
  });

  it('reports ongoing commitments without an end date', () => {
    const c = makeCommitment({ durationDays: null });
    const h = makeHabit({ commitmentId: c.id });
    const p = commitmentProgress(c, [h], idx([h], [makeLog(h.id, '2026-11-02', 'full')], [], [c]), '2026-11-04');
    expect(p).toMatchObject({ day: 3, totalDays: null, daysRemaining: null, plannedTotal: null, timeRatio: null });
    expect(p.breakdown).toMatchObject({ eligible: 2, done: 1 });
  });

  it('counts flexible weeks inside commitment plans and ranges', () => {
    const c = makeCommitment({ durationDays: 14 });
    const h = makeHabit({ commitmentId: c.id }, { schedule: { type: 'flexWeekly', timesPerWeek: 2 } });
    const logs = [makeLog(h.id, '2026-11-03', 'minimum'), makeLog(h.id, '2026-11-05', 'skipped')];
    const i = idx([h], logs, [], [c]);
    expect(commitmentProgress(c, [h], i, '2026-11-20').plannedTotal).toBe(4);
    const w = flexWeek(h, '2026-11-02', i, '2026-11-20');
    expect(w).toMatchObject({ done: 1, missed: 1 });
    expect(w.breakdown).toMatchObject({ minimum: 1, skipped: 1 });
    expect(habitBreakdown(h, '2026-11-02', '2026-11-15', i, '2026-11-20')).toMatchObject({ eligible: 4, done: 1 });
  });

  it('uses the version in force for each day when habits change mid-range', () => {
    const h = makeHabit({}, { schedule: { type: 'daily' } });
    h.versions.push(makeVersion({ effectiveFrom: '2026-11-05', schedule: { type: 'flexWeekly', timesPerWeek: 1 } }));
    const b = habitBreakdown(h, '2026-11-02', '2026-11-08', idx([h]), '2026-11-20');
    expect(b.eligible).toBe(4); // Mon–Wed daily + one flexible session that week
  });
});

describe('suggestions extras', () => {
  const today = '2026-11-16';

  function steadyLogs(h: Habit, from = '2026-11-02', n = 14, status: ActivityLog['status'] = 'full', value: number | null = null) {
    return Array.from({ length: n }, (_, k) => {
      const d = new Date(2026, 10, 2 + k);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return makeLog(h.id, iso < from ? from : iso, status, value);
    });
  }

  it('S1: suggests a reminder, or a different time when a reminder exists', () => {
    const h = makeHabit();
    const refl = [reflection(h.id, '2026-11-10', { obstacles: ['time'] }), reflection(h.id, '2026-11-12', { obstacles: ['forgot'] })];
    const base = { reflections: refl, automaticity: [], today };
    const a = generateSuggestions({ ...base, habits: [h], idx: idx([h], steadyLogs(h)) });
    expect(a.find((s) => s.rule === 'S1')?.change).toEqual({ kind: 'reminder', time: '08:00' });
    const withReminder = makeHabit({ id: h.id }, { reminderTime: '08:00' });
    const b = generateSuggestions({ ...base, habits: [withReminder], idx: idx([withReminder], steadyLogs(withReminder)) });
    expect(b.find((s) => s.rule === 'S1')?.change).toEqual({ kind: 'timeOfDay', from: 'morning', to: 'evening' });
  });

  it('S5: proposes the next taper step, but never for sensitive behaviours', () => {
    const taper = makeHabit(
      { kind: 'reduce', title: 'Scrolling' },
      { build: null, reduce: { mode: 'taper', unit: 'min', baseline: 90, limit: 60, finalTarget: 30, triggers: [], sensitive: false } },
    );
    const logs = steadyLogs(taper, '2026-11-02', 14, 'logged', 50);
    const s = generateSuggestions({ habits: [taper], reflections: [], automaticity: [], idx: idx([taper], logs), today });
    expect(s.find((x) => x.rule === 'S5')?.change).toEqual({ kind: 'limit', from: 60, to: 51, unit: 'min' });

    const sensitive = { ...taper, versions: [{ ...taper.versions[0], reduce: { ...taper.versions[0].reduce!, sensitive: true } }] };
    const none = generateSuggestions({ habits: [sensitive], reflections: [], automaticity: [], idx: idx([sensitive], logs), today });
    expect(none.find((x) => x.rule === 'S5')).toBeUndefined();
  });

  it('S6: suggests planning for a recurring trigger', () => {
    const r = makeReduceHabit();
    const logs = steadyLogs(r, '2026-11-02', 14, 'logged', 20);
    const refl = ['2026-11-05', '2026-11-08', '2026-11-11'].map((d) => reflection(r.id, d, { triggers: ['Boredom'] }));
    const s = generateSuggestions({ habits: [r], reflections: refl, automaticity: [], idx: idx([r], logs), today });
    expect(s.find((x) => x.rule === 'S6')?.change).toEqual({ kind: 'plan', trigger: 'Boredom' });
  });

  it('skips paused or archived habits and respects a low automaticity rating', () => {
    const paused = makeHabit({ status: 'paused' });
    expect(generateSuggestions({ habits: [paused], reflections: [], automaticity: [], idx: idx([paused]), today })).toEqual([]);
    const h = makeHabit();
    const rating = { id: 'a', createdAt: stamp, updatedAt: stamp, habitId: h.id, date: '2026-11-10', score: 3 };
    const s = generateSuggestions({ habits: [h], reflections: [], automaticity: [rating], idx: idx([h], steadyLogs(h)), today });
    expect(s.find((x) => x.rule === 'S4')).toBeUndefined();
  });
});
