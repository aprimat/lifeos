import { weekdayShort } from '@/domain/dates';
import type { HabitVersion, Schedule } from '@/domain/types';

import type { TemplateHabit } from '@/data/templates';

export function describeSchedule(s: Schedule): string {
  switch (s.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const d = [...s.weekdays].sort();
      if (d.join(',') === '0,1,2,3,4') return 'Weekdays';
      if (d.length === 7) return 'Every day';
      return d.map(weekdayShort).join(', ');
    }
    case 'flexWeekly':
      return `${s.timesPerWeek}× per week`;
    case 'dates':
      return `${s.dates.length} chosen dates`;
  }
}

export function describeTarget(v: Omit<HabitVersion, 'effectiveFrom'>): string {
  if (v.build) {
    if (v.build.trackingType === 'check') return 'Done / not done';
    return `${v.build.target} ${v.build.unit}${v.build.minimum ? ` (minimum ${v.build.minimum})` : ''}`;
  }
  if (v.reduce) {
    if (v.reduce.mode === 'avoid') return 'Avoid entirely';
    if (v.reduce.mode === 'limit') return `At most ${v.reduce.limit} ${v.reduce.unit} a day`;
    return `Step down from ${v.reduce.baseline ?? v.reduce.limit} to ${v.reduce.finalTarget ?? v.reduce.limit} ${v.reduce.unit} a day`;
  }
  return '';
}

export function describeTemplateHabit(h: TemplateHabit): string {
  return `${describeSchedule(h.version.schedule)} · ${describeTarget(h.version)}`;
}
