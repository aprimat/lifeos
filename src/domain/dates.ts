import type { ISODate } from './types';

/** Pure local-date helpers. All dates are `YYYY-MM-DD` in the user's local calendar. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // noon avoids DST edge cases
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: ISODate): number {
  return (parseISODate(date).getDay() + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date));
}

export function endOfWeek(date: ISODate): ISODate {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: ISODate): ISODate {
  const d = parseISODate(startOfMonth(date));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISODate(d);
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  if (start > end) return out;
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function inRange(date: ISODate, start: ISODate, end: ISODate | null): boolean {
  return date >= start && (end === null || date <= end);
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const weekdayShort = (i: number) => WEEKDAY_SHORT[i];
export const weekdayLetter = (i: number) => WEEKDAY_LETTER[i];

/** "Oct 23" */
export function formatShort(date: ISODate): string {
  const d = parseISODate(date);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Thu, Oct 24" */
export function formatShortDay(date: ISODate): string {
  return `${WEEKDAY_SHORT[weekdayIndex(date)]}, ${formatShort(date)}`;
}

/** "Thursday, October 24" */
export function formatLong(date: ISODate): string {
  const d = parseISODate(date);
  return `${WEEKDAY_LONG[weekdayIndex(date)]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** "November 2026" */
export function formatMonth(date: ISODate): string {
  const d = parseISODate(date);
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRange(start: ISODate, end: ISODate): string {
  return start === end ? formatShort(start) : `${formatShort(start)} – ${formatShort(end)}`;
}

export function dayOfMonth(date: ISODate): number {
  return parseISODate(date).getDate();
}

/** "08:15" → "8:15 AM" */
export function formatTime(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
