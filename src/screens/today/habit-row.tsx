import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card, IconTile, Row } from '@/components/card';
import { CheckCircle } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { setLog } from '@/data/actions';
import { useStore } from '@/data/store';
import type { Occurrence } from '@/domain/schedule';
import type { ISODate } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { elapsedMs, formatClock, useTimer } from '@/services/timer';
import { radius, spacing } from '@/theme/tokens';

import { checkState, REFLECT_STATUSES, statusLine } from './labels';

export interface HabitRowProps {
  occ: Occurrence;
  date: ISODate;
  today: ISODate;
  editable: boolean;
  inset?: boolean;
  /** Extra right-side note (e.g. "2 of 3 this week"). */
  note?: string;
  onOpen: (initialValue?: number) => void;
}

export function HabitRow({ occ, date, today, editable, inset, note, onOpen }: HabitRowProps) {
  const c = useColors();
  const { habit, status, log } = occ;
  const reflected = useStore((s) => s.data.reflections.some((r) => r.habitId === habit.id && r.date === date));
  const done = status === 'full' || status === 'minimum' || status === 'partial' || status === 'within';
  const isReduce = habit.kind === 'reduce';
  const showReflect =
    editable && !reflected && REFLECT_STATUSES.includes(status) && (status !== 'missed' && status !== 'notLogged' ? true : date < today);

  const onCheck = () => {
    if (!editable) return;
    if (!log) {
      const b = occ.version.build;
      setLog(habit.id, date, { status: 'full', value: b && b.trackingType !== 'check' ? b.target : null });
    } else onOpen();
  };

  const body = (
    <View style={{ gap: spacing.sm }}>
      <Row gap={spacing.md}>
        {isReduce ? (
          <IconTile tone={status === 'over' ? 'amber' : status === 'within' ? 'sage' : 'neutral'} size={36}>
            <Icon name={habit.icon} size={20} color={status === 'over' ? c.amber : status === 'within' ? c.sage : c.textSecondary} />
          </IconTile>
        ) : (
          <CheckCircle
            state={checkState(status)}
            label={`${habit.title}${done ? ', done' : ''}`}
            onPress={editable ? onCheck : undefined}
            onLongPress={editable ? () => onOpen() : undefined}
          />
        )}
        <Pressable
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={`Open ${habit.title}`}
          onPress={() => router.push(`/habit/${habit.id}`)}>
          <Text variant="bodyLg" numberOfLines={1} strike={done && !isReduce} tone={done && !isReduce ? 'secondary' : 'primary'}>
            {habit.title}
          </Text>
          <Text variant="bodySm" tone="tertiary" numberOfLines={1}>
            {statusLine(occ)}
          </Text>
        </Pressable>
        {note ? (
          <Text variant="labelMd" tone="secondary" tabular>
            {note}
          </Text>
        ) : null}
        {isReduce && editable ? (
          <Button size="sm" variant="secondary" icon={log ? 'edit' : 'add'} title={log ? 'Edit' : 'Log'} onPress={() => onOpen()} />
        ) : editable ? (
          <IconButton icon="more-horiz" accessibilityLabel={`More options for ${habit.title}`} onPress={() => onOpen()} size={44} />
        ) : (
          <Icon name={habit.icon} size={20} color={c.textTertiary} />
        )}
      </Row>
      <TimerLine habitId={habit.id} date={date} onStop={(min) => onOpen(min)} />
      {showReflect ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/reflection?habitId=${habit.id}&date=${date}`)}
          style={[styles.reflect, { backgroundColor: c.inset }]}>
          <Icon name="lightbulb-outline" size={16} color={c.primaryText} />
          <Text variant="labelMd" tone="accent" style={{ flex: 1 }}>
            What got in the way? (optional)
          </Text>
          <Icon name="chevron-right" size={18} color={c.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );

  return inset ? (
    <Card inset padding={spacing.md - 4}>
      {body}
    </Card>
  ) : (
    <Card>{body}</Card>
  );
}

/** Live timer line for a running/paused habit timer. */
function TimerLine({ habitId, date, onStop }: { habitId: string; date: ISODate; onStop: (minutes: number) => void }) {
  const c = useColors();
  const timer = useTimer();
  const active = timer.habitId === habitId && timer.date === date;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active || !timer.startedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active, timer.startedAt]);
  if (!active) return null;
  const ms = elapsedMs(timer);
  const reached = ms >= timer.targetMinutes * 60000;
  return (
    <View style={[styles.timer, { backgroundColor: c.inset }]} accessibilityLabel={`Timer ${formatClock(ms)}`}>
      <View style={[styles.dot, { backgroundColor: timer.startedAt ? c.primary : c.idle }]} />
      <Text variant="labelLg" tabular style={{ flex: 1 }}>
        {formatClock(ms)}
        <Text variant="bodySm" tone="tertiary">
          {reached ? '  · target reached' : `  · target ${timer.targetMinutes} min`}
        </Text>
      </Text>
      {timer.startedAt ? (
        <Button size="sm" variant="secondary" icon="pause" title="Pause" onPress={() => timer.pause()} />
      ) : (
        <Button size="sm" variant="secondary" icon="play-arrow" title="Resume" onPress={() => timer.resume()} />
      )}
      <Button
        size="sm"
        variant="dark"
        icon="stop"
        title="Stop"
        onPress={async () => {
          const min = await timer.stop();
          onStop(min);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reflect: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 40, borderRadius: radius.md },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
