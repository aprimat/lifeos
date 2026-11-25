import type { ActivityLog, Commitment, Habit, HabitVersion, ISODate, LogStatus, ScheduleException } from './types';

/** Small builders used by unit tests (and the dev seed). */

let n = 0;
const nextId = (p: string) => `${p}_${++n}`;
const stamp = '2026-01-01T00:00:00.000Z';

export function makeVersion(partial: Partial<HabitVersion> = {}): HabitVersion {
  return {
    effectiveFrom: '2026-11-02',
    schedule: { type: 'daily' },
    build: { trackingType: 'duration', target: 10, unit: 'min', minimum: 2, minimumLabel: null },
    reduce: null,
    timeOfDay: 'morning',
    reminderTime: null,
    anchor: null,
    ...partial,
  };
}

export function makeHabit(partial: Partial<Habit> = {}, version: Partial<HabitVersion> = {}): Habit {
  const startDate = partial.startDate ?? '2026-11-02';
  return {
    id: nextId('habit'),
    createdAt: stamp,
    updatedAt: stamp,
    kind: 'build',
    title: 'Practice speaking',
    icon: 'record-voice-over',
    goalIds: [],
    status: 'active',
    startDate,
    archivedAt: null,
    pauses: [],
    versions: [makeVersion({ effectiveFrom: startDate, ...version })],
    safetyAcknowledged: false,
    ...partial,
  };
}

export function makeReduceHabit(partial: Partial<Habit> = {}, limit = 30, baseline = 90): Habit {
  return makeHabit(
    { kind: 'reduce', title: 'Social media scrolling', ...partial },
    {
      build: null,
      reduce: { mode: 'limit', unit: 'min', baseline, limit, finalTarget: null, triggers: [], sensitive: false },
    },
  );
}

export function makeLog(
  habitId: string,
  date: ISODate,
  status: LogStatus,
  value: number | null = null,
  extra: Partial<ActivityLog> = {},
): ActivityLog {
  return {
    id: nextId('log'),
    createdAt: stamp,
    updatedAt: stamp,
    habitId,
    date,
    status,
    value,
    rescheduledTo: null,
    urges: null,
    urgeIntensity: null,
    note: null,
    ...extra,
  };
}

export function makeCommitment(partial: Partial<Commitment> = {}): Commitment {
  return {
    id: nextId('commitment'),
    createdAt: stamp,
    updatedAt: stamp,
    goalId: null,
    habitIds: [],
    title: 'Practice English consistently',
    startDate: '2026-11-02',
    durationDays: 30,
    status: 'active',
    templateId: null,
    renewedFromId: null,
    pauses: [],
    endedAt: null,
    ...partial,
  };
}

export function makeException(partial: Partial<ScheduleException>): ScheduleException {
  return {
    id: nextId('exception'),
    createdAt: stamp,
    updatedAt: stamp,
    habitId: null,
    commitmentId: null,
    start: '2026-11-10',
    end: '2026-11-10',
    kind: 'rest',
    note: null,
    ...partial,
  };
}
