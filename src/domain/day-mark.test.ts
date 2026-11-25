import { dayMark, dayMarkLabel } from './day-mark';

const today = '2026-11-24';
const day = (date: string, done: number, planned: number) => ({ date, done, planned });

test('marks a day by how many planned habits were done', () => {
  expect(dayMark(day('2026-11-23', 3, 3), today)).toBe('all');
  expect(dayMark(day('2026-11-23', 1, 3), today)).toBe('some');
  expect(dayMark(day('2026-11-23', 0, 3), today)).toBe('none');
  expect(dayMark(day('2026-11-23', 0, 0), today)).toBeNull();
  // Today isn't "none" yet, and a future day is "planned".
  expect(dayMark(day(today, 0, 3), today)).toBe('planned');
  expect(dayMark(day(today, 1, 3), today)).toBe('some');
  expect(dayMark(day('2026-11-30', 0, 2), today)).toBe('planned');
  // An extra session on a day with nothing planned still counts as done.
  expect(dayMark(day('2026-11-23', 1, 0), today)).toBe('all');
});

test('reads out the mark', () => {
  expect(dayMarkLabel(day('2026-11-23', 2, 3), 'some')).toBe('2 of 3 done');
  expect(dayMarkLabel(day('2026-11-30', 0, 2), 'planned')).toBe('2 planned');
  expect(dayMarkLabel(day('2026-11-23', 0, 0), null)).toBe('nothing planned');
});
