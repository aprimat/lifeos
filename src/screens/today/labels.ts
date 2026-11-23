import type { DayStatus, Occurrence } from '@/domain/schedule';
import type { CheckState } from '@/components/controls';
import type { HabitVersion } from '@/domain/types';

/** Short description of a habit's daily target. */
export function targetLabel(v: HabitVersion): string {
  if (v.build) {
    const b = v.build;
    if (b.trackingType === 'duration') return `${b.target} min`;
    if (b.trackingType === 'quantity') return `${b.target} ${b.unit}`;
    return 'Once';
  }
  if (v.reduce) {
    const r = v.reduce;
    if (r.mode === 'avoid') return 'Avoid today';
    return `Up to ${r.limit} ${r.unit}`;
  }
  return '';
}

export function minimumLabel(v: HabitVersion): string | null {
  const b = v.build;
  if (!b || b.minimum === null) return null;
  if (b.minimumLabel) return b.minimumLabel;
  return b.trackingType === 'duration' ? `${b.minimum} min` : `${b.minimum} ${b.unit}`;
}

export function checkState(status: DayStatus): CheckState {
  switch (status) {
    case 'full':
    case 'within':
      return 'done';
    case 'minimum':
      return 'minimum';
    case 'partial':
      return 'partial';
    case 'skipped':
      return 'skipped';
    case 'rest':
      return 'rest';
    case 'over':
      return 'over';
    default:
      return 'idle';
  }
}

/** One-line status description for a row subtitle. */
export function statusLine(o: Occurrence): string {
  const v = o.version;
  const log = o.log;
  if (o.habit.kind === 'reduce' && v.reduce) {
    if (!log) return targetLabel(v);
    const amount = `${log.value ?? 0} ${v.reduce.unit}`;
    return o.status === 'over' ? `${amount} · over today's limit` : `${amount} · within limit`;
  }
  const parts: string[] = [];
  switch (o.status) {
    case 'minimum':
      parts.push(`Minimum version${log?.value ? ` · ${log.value} ${v.build?.unit ?? ''}` : ''}`.trim());
      break;
    case 'partial':
      parts.push(`Partial · ${log?.value ?? 0} of ${targetLabel(v)}`);
      break;
    case 'skipped':
      parts.push('Skipped');
      break;
    case 'rest':
      parts.push('Rest day');
      break;
    case 'rescheduled':
      parts.push('Moved to another day');
      break;
    default:
      parts.push(targetLabel(v));
      if (v.anchor) parts.push(v.anchor);
  }
  return parts.join(' · ');
}

/** Statuses after which a gentle "What got in the way?" prompt is offered. */
export const REFLECT_STATUSES: DayStatus[] = ['skipped', 'partial', 'over', 'missed', 'notLogged'];
