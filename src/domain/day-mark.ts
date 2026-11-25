/** How a day went: all planned habits done, some, none, or still to come. */
export type DayMark = 'all' | 'some' | 'none' | 'planned' | null;

export function dayMark(d: { date: string; done: number; planned: number }, today: string): DayMark {
  if (d.planned === 0) return d.done > 0 ? 'all' : null;
  if (d.done >= d.planned) return 'all';
  if (d.date > today) return 'planned';
  if (d.done > 0) return 'some';
  return d.date === today ? 'planned' : 'none';
}

export function dayMarkLabel(d: { done: number; planned: number }, mark: DayMark): string {
  if (mark === null) return 'nothing planned';
  if (mark === 'planned' && d.done === 0) return `${d.planned} planned`;
  return `${d.done} of ${d.planned} done`;
}
