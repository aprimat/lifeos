import { useEffect, useState } from 'react';

/** How long a just-ticked habit stays in place before it moves down (time to see it, or undo). */
export const SINK_DELAY_MS = 1000;

/**
 * Orders items so the done ones come last, keeping the given order within each part.
 * A newly done item moves down after a short pause; an undone one moves back up at once.
 * `dayKey` resets the order instantly when another day is shown.
 */
export function useDoneLast<T>(items: T[], idOf: (t: T) => string, isDone: (t: T) => boolean, dayKey: string): T[] {
  const doneIds = items.filter(isDone).map(idOf);
  const doneKey = doneIds.join('|');
  const [sunk, setSunk] = useState<string[]>(doneIds);
  const [shownDay, setShownDay] = useState(dayKey);
  if (shownDay !== dayKey) {
    setShownDay(dayKey);
    setSunk(doneIds);
  }

  useEffect(() => {
    const done = doneKey ? doneKey.split('|') : [];
    const t = setTimeout(() => setSunk(done), SINK_DELAY_MS);
    return () => clearTimeout(t);
  }, [doneKey]);

  // Undone ones move back up at once: only items that are still done can stay at the bottom.
  const bottom = new Set(sunk.filter((id) => doneIds.includes(id)));
  return [...items.filter((t) => !bottom.has(idOf(t))), ...items.filter((t) => bottom.has(idOf(t)))];
}
