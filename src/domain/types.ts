/**
 * LifeOS domain model.
 *
 * Dates are local calendar dates as `YYYY-MM-DD` strings (ISODate).
 * Times of day are `HH:mm`. Timestamps (createdAt etc.) are ISO-8601 strings.
 * Weekday indexes are 0 = Monday … 6 = Sunday.
 */

export type ID = string;
export type ISODate = string;
export type TimeHM = string;

export type FocusArea =
  | 'learning'
  | 'health'
  | 'focus'
  | 'wellbeing'
  | 'relationships'
  | 'growth';

export interface Entity {
  id: ID;
  createdAt: string;
  updatedAt: string;
}

export interface User extends Entity {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  focusAreas: FocusArea[];
  onboardingCompletedAt: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  remindersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: TimeHM;
  quietEnd: TimeHM;
  weeklyReviewReminder: boolean;
  theme: ThemePreference;
  reducedMotion: boolean;
  biometricLock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: false,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:30',
  weeklyReviewReminder: true,
  theme: 'system',
  reducedMotion: false,
  biometricLock: false,
};

/** `concluded` is from older data; new goals are marked `achieved`. */
export type GoalStatus = 'active' | 'achieved' | 'archived' | 'concluded';

export interface Goal extends Entity {
  title: string;
  focusArea: FocusArea | null;
  myWhy: string | null;
  desiredOutcome: string | null;
  status: GoalStatus;
  /** Set when the user marks the goal achieved. */
  achievedAt?: ISODate | null;
}

export interface Milestone extends Entity {
  ownerType: 'goal' | 'commitment';
  ownerId: ID;
  title: string;
  /** Optional: achieved automatically when this many sessions are done (commitment milestones). */
  targetSessions: number | null;
  targetDate: ISODate | null;
  achievedAt: ISODate | null;
}

export type CommitmentStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface DateRange {
  start: ISODate;
  /** Inclusive. `null` = still open (e.g. an ongoing pause). */
  end: ISODate | null;
}

export interface Commitment extends Entity {
  goalId: ID | null;
  /** The habits this commitment covers. It points at them; it never owns them. */
  habitIds: ID[];
  title: string;
  startDate: ISODate;
  /** `null` = ongoing (no fixed end date). */
  durationDays: number | null;
  status: CommitmentStatus;
  templateId: string | null;
  renewedFromId: ID | null;
  pauses: DateRange[];
  /** Set when the user ends/finishes the commitment. */
  endedAt: ISODate | null;
}

export type HabitKind = 'build' | 'reduce';
export type HabitStatus = 'active' | 'paused' | 'archived';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type Schedule =
  | { type: 'daily' }
  | { type: 'weekdays'; weekdays: number[] }
  | { type: 'flexWeekly'; timesPerWeek: number }
  | { type: 'dates'; dates: ISODate[] };

export type TrackingType = 'check' | 'duration' | 'quantity';

export interface BuildConfig {
  trackingType: TrackingType;
  /** Minutes for duration, count for quantity, 1 for check. */
  target: number;
  unit: string;
  /** Minimum-effort version value (same unit). `null` = none. */
  minimum: number | null;
  minimumLabel: string | null;
}

export type ReduceMode = 'avoid' | 'limit' | 'taper';

export interface ReduceConfig {
  mode: ReduceMode;
  unit: string;
  baseline: number | null;
  /** Current daily limit. 0 for avoid. For taper this is the current step. */
  limit: number;
  /** Final target for taper mode. */
  finalTarget: number | null;
  triggers: string[];
  sensitive: boolean;
}

export interface HabitVersion {
  effectiveFrom: ISODate;
  schedule: Schedule;
  build: BuildConfig | null;
  reduce: ReduceConfig | null;
  timeOfDay: TimeOfDay;
  reminderTime: TimeHM | null;
  anchor: string | null;
}

export interface Habit extends Entity {
  kind: HabitKind;
  title: string;
  icon: string;
  /** Goals this habit supports (zero or more). */
  goalIds: ID[];
  status: HabitStatus;
  startDate: ISODate;
  archivedAt: ISODate | null;
  pauses: DateRange[];
  /** Sorted ascending by effectiveFrom. Never rewritten, only appended. */
  versions: HabitVersion[];
  safetyAcknowledged: boolean;
}

export type ExceptionKind = 'rest' | 'travel' | 'holiday' | 'busy';

export interface ScheduleException extends Entity {
  /** If both are null, applies to every habit. */
  habitId: ID | null;
  commitmentId: ID | null;
  start: ISODate;
  end: ISODate;
  kind: ExceptionKind;
  note: string | null;
}

export type LogStatus = 'full' | 'minimum' | 'partial' | 'skipped' | 'rescheduled' | 'logged';

export interface ActivityLog extends Entity {
  habitId: ID;
  date: ISODate;
  /** `logged` is used by reduce habits (value holds the amount). */
  status: LogStatus;
  value: number | null;
  rescheduledTo: ISODate | null;
  urges: number | null;
  urgeIntensity: number | null;
  note: string | null;
}

export type Obstacle =
  | 'time'
  | 'forgot'
  | 'lowEnergy'
  | 'difficult'
  | 'motivation'
  | 'unexpected'
  | 'urge'
  | 'other';

export interface Reflection extends Entity {
  habitId: ID;
  date: ISODate;
  obstacles: Obstacle[];
  triggers: string[];
  helpNextTime: string | null;
  note: string | null;
}

export type Disposition = 'grounded' | 'energized' | 'steady' | 'restless' | 'depleted';

export interface CheckIn extends Entity {
  date: ISODate;
  disposition: Disposition | null;
  energy: number | null;
  stress: number | null;
  sleepHours: string | null;
  sleepRestorative: boolean | null;
  note: string | null;
}

export interface AutomaticityRating extends Entity {
  habitId: ID;
  date: ISODate;
  score: number;
}

export type SuggestionDecision = 'accepted' | 'edited' | 'dismissed';

export interface WeeklyReview extends Entity {
  weekStart: ISODate;
  gaveEnergy: string | null;
  feltHeavy: string | null;
  note: string | null;
  decisions: { suggestionId: string; habitId: ID; rule: string; decision: SuggestionDecision }[];
  completedAt: string | null;
}

export type CommitmentNextStep =
  | 'renew'
  | 'extend'
  | 'adjust'
  | 'new'
  | 'keepHabits'
  | 'finish';

export interface CommitmentReview extends Entity {
  commitmentId: ID;
  reflection: string | null;
  stillMatters: 'yes' | 'changed' | null;
  nextStep: CommitmentNextStep | null;
}

/** Everything stored for one user. */
/**
 * A one-off action toward a goal (plan v1.4): it belongs to one goal and never repeats.
 * Shown on Today only on its date (and after, until done). Time spent is optional.
 */
export interface Step extends Entity {
  goalId: ID;
  title: string;
  date: ISODate | null;
  doneAt: ISODate | null;
  minutes: number | null;
}

export const SCHEMA_VERSION = 3;

export interface UserData {
  schemaVersion: typeof SCHEMA_VERSION;
  settings: Settings;
  goals: Goal[];
  milestones: Milestone[];
  steps: Step[];
  commitments: Commitment[];
  habits: Habit[];
  exceptions: ScheduleException[];
  logs: ActivityLog[];
  reflections: Reflection[];
  checkIns: CheckIn[];
  automaticity: AutomaticityRating[];
  weeklyReviews: WeeklyReview[];
  commitmentReviews: CommitmentReview[];
  dismissedPrompts: string[];
}

export function emptyUserData(): UserData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    goals: [],
    milestones: [],
    steps: [],
    commitments: [],
    habits: [],
    exceptions: [],
    logs: [],
    reflections: [],
    checkIns: [],
    automaticity: [],
    weeklyReviews: [],
    commitmentReviews: [],
    dismissedPrompts: [],
  };
}
