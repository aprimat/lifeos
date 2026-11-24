import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useStore } from '@/data/store';
import { addDays, parseISODate, todayISO, weekdayIndex } from '@/domain/dates';
import { flexWeek } from '@/domain/analytics';
import { buildIndex, exceptionFor, isHabitActiveOn, occurrence, versionOn } from '@/domain/schedule';
import type { Settings, UserData } from '@/domain/types';

/**
 * Local notifications (IMPLEMENTATION_PLAN.md §10.1).
 * Strategy: schedule exact one-off reminders for the next 7 days, so planned rest
 * days, pauses and quiet hours are respected precisely. Re-synced on every data change.
 */

const isWeb = Platform.OS === 'web';
const HORIZON_DAYS = 7;
const MAX_SCHEDULED = 60; // iOS allows 64 pending notifications.

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Gentle reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    // Never block reminders on channel setup; Android falls back to the default channel.
    console.warn('LifeOS: could not create notification channel', e);
  }
}

export async function hasPermission(): Promise<boolean> {
  if (isWeb) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Ask only when the user turns a reminder on (never at launch). */
export async function requestPermission(): Promise<boolean> {
  if (isWeb) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const toMinutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/** Returns the delivery time in minutes after midnight, shifted out of quiet hours, or null to drop it. */
export function applyQuietHours(minutes: number, settings: Pick<Settings, 'quietHoursEnabled' | 'quietStart' | 'quietEnd'>): number | null {
  if (!settings.quietHoursEnabled) return minutes;
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  const inQuiet = start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
  if (!inQuiet) return minutes;
  // Early-morning quiet period → deliver when it ends. Late-evening → drop (don't push to tomorrow).
  if (start > end && minutes < end) return end;
  if (start <= end) return end < 24 * 60 ? end : null;
  return null;
}

function at(date: string, minutes: number): Date {
  const d = parseISODate(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

interface Planned {
  date: Date;
  title: string;
  body: string;
}

export function planReminders(data: UserData, now = new Date()): Planned[] {
  const { settings } = data;
  if (!settings.remindersEnabled) return [];
  const idx = buildIndex(data);
  const today = todayISO(now);
  const out: Planned[] = [];
  const drafts = new Set(data.commitments.filter((c) => c.status === 'draft').map((c) => c.id));

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = addDays(today, i);
    for (const habit of data.habits) {
      if (habit.status === 'archived' || (habit.commitmentId && drafts.has(habit.commitmentId))) continue;
      const v = versionOn(habit, date);
      if (!v.reminderTime) continue;
      const o = occurrence(habit, date, idx, today);
      // A flexible weekly habit has no fixed days: remind while it's live (not paused, its
      // commitment still running), not a rest day, and this week's sessions aren't done yet.
      const flexibleOpen =
        v.schedule.type === 'flexWeekly' &&
        o.status === 'none' &&
        isHabitActiveOn(habit, date, idx) &&
        !exceptionFor(habit, date, idx) &&
        (() => {
          const w = flexWeek(habit, date, idx, today);
          return w.done < w.target;
        })();
      if (!o.planned && !flexibleOpen) continue; // not scheduled, rest day, paused…
      if (o.log) continue; // already logged
      const minutes = applyQuietHours(toMinutes(v.reminderTime), settings);
      if (minutes === null) continue;
      const when = at(date, minutes);
      if (when <= now) continue;
      const amount =
        v.build && v.build.trackingType === 'duration'
          ? `${v.build.target} minutes of `
          : '';
      out.push({
        date: when,
        title: habit.title,
        body:
          habit.kind === 'reduce'
            ? `A quiet moment to log today's “${habit.title.toLowerCase()}”.`
            : `Time for ${amount}${habit.title.toLowerCase()}.${v.anchor ? ` ${v.anchor}.` : ''}`,
      });
    }
  }

  if (settings.weeklyReviewReminder) {
    // Next Monday 09:00 (shifted by quiet hours).
    const offset = (7 - weekdayIndex(today)) % 7 || 7;
    const minutes = applyQuietHours(9 * 60, settings);
    if (minutes !== null) {
      out.push({
        date: at(addDays(today, offset), minutes),
        title: 'Your weekly review is ready',
        body: 'A few calm minutes to look back on last week and shape the next one.',
      });
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

let syncing: Promise<void> | null = null;
let pending: UserData | null = null;

/** Replace all scheduled reminders with a fresh plan. Safe to call often. */
export async function syncNotifications(data: UserData): Promise<void> {
  if (isWeb) return;
  pending = data;
  if (syncing) return syncing;
  syncing = (async () => {
    while (pending) {
      const next = pending;
      pending = null;
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((n) => n.content.data?.kind === 'reminder')
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );
        if (!next.settings.remindersEnabled || !(await hasPermission())) continue;
        await ensureChannel();
        for (const p of planReminders(next)) {
          await Notifications.scheduleNotificationAsync({
            content: { title: p.title, body: p.body, data: { kind: 'reminder' } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: 'reminders' },
          });
        }
      } catch (e) {
        console.warn('LifeOS: notification sync failed', e);
      }
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

export async function cancelAllNotifications() {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleTimerEnd(habitTitle: string, seconds: number): Promise<string | null> {
  if (isWeb || seconds <= 0 || !(await hasPermission())) return null;
  // Respect quiet hours: if the timer would end inside them, stay silent.
  const end = new Date(Date.now() + seconds * 1000);
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  if (applyQuietHours(endMinutes, useStore.getState().data.settings) !== endMinutes) return null;
  try {
    await ensureChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Target reached',
        body: `You've reached your target for “${habitTitle}”. Log it whenever you're ready.`,
        data: { kind: 'timer' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)), channelId: 'reminders' },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id: string) {
  if (isWeb) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
