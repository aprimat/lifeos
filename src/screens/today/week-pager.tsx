import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { WeekStrip } from '@/components/progress';
import { dailySeries } from '@/domain/analytics';
import { addDays, diffDays, endOfWeek, startOfWeek } from '@/domain/dates';
import type { DataIndex } from '@/domain/schedule';
import type { Habit, ISODate } from '@/domain/types';

/** Weeks you can swipe to on either side of this week (about 20 years): in practice, anywhere. */
const RANGE = 1040;
const OFFSETS = Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE);

/**
 * The week strip on Today, one week per page. Swipe left or right to move a week at a time;
 * tap a day to open it. Past days show how they went, future days what's planned.
 */
export function WeekPager({
  habits,
  idx,
  today,
  selected,
  onSelect,
}: {
  habits: Habit[];
  idx: DataIndex;
  today: ISODate;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
}) {
  const [width, setWidth] = useState(0);
  const list = useRef<FlatList<number>>(null);
  const thisWeek = startOfWeek(today);
  const weekOf = (d: ISODate) => Math.round(diffDays(thisWeek, startOfWeek(d)) / 7);
  // The week on screen (0 = this week). A ref: it changes on every swipe and needs no re-render.
  const [initialWeek] = useState(() => weekOf(selected));
  const shown = useRef(initialWeek);

  // Follow the selected day when it changes from outside (the calendar).
  const selectedWeek = weekOf(selected);
  useEffect(() => {
    if (!width || shown.current === selectedWeek) return;
    shown.current = selectedWeek;
    list.current?.scrollToIndex({ index: selectedWeek + RANGE, animated: true });
  }, [selectedWeek, width]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    shown.current = Math.round(e.nativeEvent.contentOffset.x / width) - RANGE;
  };

  return (
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ minHeight: 64 }}>
      {width ? (
        <FlatList
          ref={list}
          data={OFFSETS}
          keyExtractor={(o) => String(o)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialWeek + RANGE}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onMomentumScrollEnd={onEnd}
          renderItem={({ item }) => (
            <View style={{ width }}>
              <Week start={addDays(thisWeek, item * 7)} habits={habits} idx={idx} today={today} selected={selected} onSelect={onSelect} />
            </View>
          )}
          extraData={`${selected}|${today}`}
        />
      ) : null}
    </View>
  );
}

const Week = memo(function Week({
  start,
  habits,
  idx,
  today,
  selected,
  onSelect,
}: {
  start: ISODate;
  habits: Habit[];
  idx: DataIndex;
  today: ISODate;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
}) {
  const days = useMemo(() => dailySeries(habits, start, endOfWeek(start), idx, today), [habits, start, idx, today]);
  return <WeekStrip days={days} selected={selected} today={today} onSelect={onSelect} />;
});
