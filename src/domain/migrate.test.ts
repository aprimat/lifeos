import { makeCommitment, makeHabit, makeLog } from './fixtures';
import { migrateData } from './migrate';
import { buildIndex, occurrence } from './schedule';
import { emptyUserData, SCHEMA_VERSION, type UserData } from './types';

const today = '2026-11-24';

/** A v1 save: habits carry goalId / commitmentId, commitments have no habitIds. */
function v1(habits: Record<string, unknown>[], commitments: Record<string, unknown>[], logs = [] as UserData['logs']) {
  return { ...emptyUserData(), schemaVersion: 1, habits, commitments, logs } as unknown;
}

function oldHabit(extra: Record<string, unknown> = {}, partial: Parameters<typeof makeHabit>[0] = {}) {
  const { goalIds: _g, ...h } = makeHabit(partial);
  return { ...h, goalId: null, commitmentId: null, ...extra };
}

function oldCommitment(partial: Parameters<typeof makeCommitment>[0] = {}) {
  const { habitIds: _h, ...c } = makeCommitment(partial);
  return c;
}

describe('migration v1 → v2', () => {
  it('turns goalId into goalIds and commitmentId into commitment.habitIds', () => {
    const c = oldCommitment({ startDate: '2026-11-02', durationDays: 30 });
    const a = oldHabit({ goalId: 'g1', commitmentId: c.id });
    const b = oldHabit();
    const out = migrateData(v1([a, b], [c]), today);
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.habits[0].goalIds).toEqual(['g1']);
    expect(out.habits[1].goalIds).toEqual([]);
    expect(out.habits[0]).not.toHaveProperty('commitmentId');
    expect(out.habits[0]).not.toHaveProperty('goalId');
    expect(out.commitments[0].habitIds).toEqual([a.id]);
  });

  it('keeps the past reading the same: start, pauses and the end of a finished commitment', () => {
    const c = oldCommitment({
      startDate: '2026-11-05',
      durationDays: 10, // ends Nov 14
      status: 'completed',
      pauses: [{ start: '2026-11-08', end: '2026-11-09' }],
    });
    const h = oldHabit({ commitmentId: c.id }, { startDate: '2026-11-02' });
    const logs = [makeLog(h.id as string, '2026-11-06', 'full')];
    const out = migrateData(v1([h], [c], logs), today);
    const m = out.habits[0];
    expect(m.startDate).toBe('2026-11-05');
    expect(m.versions[0].effectiveFrom).toBe('2026-11-05');
    expect(m.pauses).toEqual([{ start: '2026-11-08', end: '2026-11-09' }]);
    expect(m).toMatchObject({ status: 'archived', archivedAt: '2026-11-14' });
    const i = buildIndex(out);
    expect(occurrence(m, '2026-11-06', i, today).status).toBe('full');
    expect(occurrence(m, '2026-11-08', i, today).status).toBe('none');
    expect(occurrence(m, '2026-11-14', i, today).status).toBe('missed');
    expect(occurrence(m, '2026-11-15', i, today).status).toBe('none');
  });

  it('pauses (not archives) habits of a commitment that ran out but was never finished', () => {
    const c = oldCommitment({ startDate: '2026-11-01', durationDays: 7, status: 'active' }); // ended Nov 7
    const h = oldHabit({ commitmentId: c.id }, { startDate: '2026-11-01' });
    const m = migrateData(v1([h], [c]), today).habits[0];
    expect(m.status).toBe('paused');
    expect(m.pauses).toEqual([{ start: '2026-11-08', end: null }]);
  });

  it('pauses habits of a paused commitment and leaves draft habits hidden', () => {
    const paused = oldCommitment({ startDate: '2026-11-20', durationDays: 30, status: 'paused', pauses: [{ start: '2026-11-22', end: null }] });
    const draft = oldCommitment({ startDate: '2026-11-25', durationDays: 30, status: 'draft' });
    const a = oldHabit({ commitmentId: paused.id }, { startDate: '2026-11-20' });
    const b = oldHabit({ commitmentId: draft.id }, { startDate: '2026-11-25', createdAt: '2026-11-24T10:00:00.000Z' });
    const out = migrateData(v1([a, b], [paused, draft]), today);
    expect(out.habits[0]).toMatchObject({ status: 'paused', pauses: [{ start: '2026-11-22', end: null }] });
    expect(buildIndex(out).draftHabits.has(b.id as string)).toBe(true);
  });

  it('keeps only the most recent running commitment; the others finish today and their habits go on', () => {
    const older = oldCommitment({ startDate: '2026-11-01', durationDays: 60 });
    const newer = oldCommitment({ startDate: '2026-11-10', durationDays: 60 });
    const a = oldHabit({ commitmentId: older.id }, { startDate: '2026-11-01' });
    const out = migrateData(v1([a], [older, newer]), today);
    const byId = new Map(out.commitments.map((c) => [c.id, c]));
    expect(byId.get(newer.id)!.status).toBe('active');
    expect(byId.get(older.id)).toMatchObject({ status: 'completed', endedAt: today });
    expect(out.habits[0].status).toBe('active');
  });

  it('leaves current data alone and fills missing fields', () => {
    const h = makeHabit({ goalIds: ['g'] });
    const out = migrateData({ ...emptyUserData(), habits: [h], settings: { theme: 'dark' } }, today);
    expect(out.habits[0]).toBe(h);
    expect(out.settings.theme).toBe('dark');
    expect(out.settings.quietStart).toBe('22:00');
    expect(migrateData(null, today)).toEqual(emptyUserData());
  });
});
