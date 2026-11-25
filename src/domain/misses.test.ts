import { makeHabit, makeLog } from './fixtures';
import { missSummary } from './misses';
import { buildIndex } from './schedule';
import type { ActivityLog, Habit, Obstacle, Reflection } from './types';

const idx = (habits: Habit[], logs: ActivityLog[] = []) => buildIndex({ habits, logs, exceptions: [], commitments: [] });
const reflection = (habitId: string, date: string, obstacles: Obstacle[]): Reflection => ({
  id: `${habitId}-${date}`,
  createdAt: '',
  updatedAt: '',
  habitId,
  date,
  obstacles,
  triggers: [],
  helpNextTime: null,
  note: null,
});

describe('why you missed', () => {
  it('counts misses and the reasons noted, and finds the time of day they cluster in', () => {
    const evening = makeHabit({ title: 'Read' }, { timeOfDay: 'evening' });
    const morning = makeHabit({ title: 'Walk' }, { timeOfDay: 'morning' });
    // Nov 2–8: Read misses every day but one; Walk done every day but Wednesday (skipped).
    const logs = [
      makeLog(evening.id, '2026-11-02', 'full'),
      ...['03', '04', '05', '06', '07', '08'].map((d) => makeLog(morning.id, `2026-11-${d}`, 'full')),
      makeLog(morning.id, '2026-11-02', 'skipped'),
    ];
    const refl = [
      reflection(evening.id, '2026-11-03', ['time']),
      reflection(evening.id, '2026-11-04', ['time', 'lowEnergy']),
      reflection(morning.id, '2026-11-02', ['forgot']),
    ];
    const s = missSummary([evening, morning], refl, '2026-11-02', '2026-11-08', idx([evening, morning], logs), '2026-11-20');
    expect(s.misses).toBe(7);
    expect(s.withReason).toBe(3);
    expect(s.reasons[0]).toEqual({ obstacle: 'time', count: 2 });
    expect(s.timeOfDay).toEqual({ value: 'evening', count: 6 });
    expect(s.byHabit.map((x) => x.habit.title)).toEqual(['Read', 'Walk']);
  });

  it("leaves today open and doesn't invent patterns from too little", () => {
    const h = makeHabit({}, { timeOfDay: 'evening' });
    const s = missSummary([h], [], '2026-11-02', '2026-11-08', idx([h]), '2026-11-04');
    expect(s.misses).toBe(2); // Nov 2 and 3; today (Nov 4) is still open
    expect(s.timeOfDay).toBeNull();
    expect(s.weekday).toBeNull();
  });
});
