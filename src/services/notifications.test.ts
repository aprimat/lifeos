import { addDays, todayISO } from '@/domain/dates';
import { makeException, makeHabit, makeLog } from '@/domain/fixtures';
import { emptyUserData } from '@/domain/types';

import { applyQuietHours, planReminders } from './notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

const quiet = { quietHoursEnabled: true, quietStart: '22:00', quietEnd: '07:30' };

describe('quiet hours', () => {
  it('moves early-morning reminders to the end of quiet hours', () => {
    expect(applyQuietHours(6 * 60, quiet)).toBe(7 * 60 + 30);
  });
  it('drops late-evening reminders instead of pushing them to tomorrow', () => {
    expect(applyQuietHours(23 * 60, quiet)).toBeNull();
  });
  it('keeps reminders outside quiet hours', () => {
    expect(applyQuietHours(8 * 60, quiet)).toBe(8 * 60);
    expect(applyQuietHours(23 * 60, { ...quiet, quietHoursEnabled: false })).toBe(23 * 60);
  });
});

describe('planReminders', () => {
  const today = todayISO();
  const now = new Date();
  now.setHours(0, 1, 0, 0);

  function data(habitPatch = {}) {
    const h = makeHabit({ startDate: addDays(today, -3), ...habitPatch }, { reminderTime: '08:00', effectiveFrom: addDays(today, -3) });
    const d = emptyUserData();
    d.settings.remindersEnabled = true;
    d.settings.weeklyReviewReminder = false;
    d.habits = [h];
    return { d, h };
  }

  it('schedules one reminder per planned day for the next week', () => {
    const { d } = data();
    expect(planReminders(d, now)).toHaveLength(7);
  });

  it('skips planned rest days and days already logged', () => {
    const { d, h } = data();
    d.exceptions = [makeException({ habitId: h.id, start: addDays(today, 1), end: addDays(today, 2) })];
    d.logs = [makeLog(h.id, today, 'full')];
    expect(planReminders(d, now)).toHaveLength(4);
  });

  it('schedules nothing when reminders are off', () => {
    const { d } = data();
    d.settings.remindersEnabled = false;
    expect(planReminders(d, now)).toHaveLength(0);
  });
});

describe('planReminders for flexible weekly habits', () => {
  const today = todayISO();
  const now = new Date();
  now.setHours(0, 1, 0, 0);

  function flex(habitPatch = {}) {
    const h = makeHabit(
      { startDate: addDays(today, -3), ...habitPatch },
      { reminderTime: '08:00', effectiveFrom: addDays(today, -3), schedule: { type: 'flexWeekly', timesPerWeek: 3 } },
    );
    const d = emptyUserData();
    d.settings.remindersEnabled = true;
    d.settings.weeklyReviewReminder = false;
    d.habits = [h];
    return { d, h };
  }

  it('reminds while the habit is live', () => {
    expect(planReminders(flex().d, now).length).toBeGreaterThan(0);
  });

  it('stops reminding when the habit is paused', () => {
    const { d } = flex({ pauses: [{ start: addDays(today, -1), end: null }], status: 'paused' });
    expect(planReminders(d, now)).toHaveLength(0);
  });
});
