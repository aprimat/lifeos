import type { ActivityLog, HabitVersion } from './types';

/**
 * Unticking a habit removes its log. Ask first only when that would lose something the user
 * typed: a note, or an amount different from the usual target.
 */
export function untickNeedsConfirm(log: Pick<ActivityLog, 'note' | 'value' | 'status'>, version: Pick<HabitVersion, 'build'>): boolean {
  if (log.note?.trim()) return true;
  const b = version.build;
  if (!b || b.trackingType === 'check' || log.value === null) return false;
  if (log.status === 'minimum') return b.minimum !== null && log.value !== b.minimum;
  return log.value !== b.target;
}
