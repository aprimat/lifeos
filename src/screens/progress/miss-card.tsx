import { Card, Row, Stack } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { OBSTACLES, TIME_OF_DAY } from '@/copy';
import type { MissSummary } from '@/domain/misses';
import type { Obstacle } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

/** One gentle idea per reason. Suggestions only; nothing changes unless the user edits the habit. */
const TRY: Record<Obstacle, string> = {
  time: 'On full days, the minimum version still counts.',
  forgot: 'A reminder, or tying it to something you already do ("after coffee"), helps it stick.',
  lowEnergy: 'A different time of day, when you have more energy, may suit it better.',
  difficult: 'A smaller target makes it easier to start.',
  motivation: 'Linking it to a goal, and why that goal matters, can help on flat days.',
  unexpected: "When you know a busy day is coming, plan it as a rest day. It won't count as a miss.",
  urge: 'Noting the trigger and planning what to do instead helps next time.',
  other: 'Noting what got in the way after a miss makes patterns easier to spot.',
};

const label = (o: Obstacle) => (OBSTACLES.find((x) => x.value === o)?.label ?? o).toLowerCase();

/** "Why you missed": the reasons noted, where misses cluster, and one idea to try. */
export function MissCard({ summary }: { summary: MissSummary }) {
  const c = useColors();
  const s = summary;
  if (s.misses === 0) return null;
  const topReason = s.reasons[0];
  const pattern = s.timeOfDay
    ? `Mostly ${s.timeOfDay.value === 'morning' ? 'in the morning' : s.timeOfDay.value === 'afternoon' ? 'in the afternoon' : 'in the evening'} (${s.timeOfDay.count} of ${s.misses}).`
    : s.weekday
      ? `Mostly on ${WEEKDAYS[s.weekday.index]} (${s.weekday.count} of ${s.misses}).`
      : null;
  const todLabel = s.timeOfDay ? TIME_OF_DAY.find((t) => t.value === s.timeOfDay!.value)?.label.toLowerCase() : null;

  return (
    <Card>
      <Stack gap={spacing.sm}>
        <Row>
          <Icon name="psychology-alt" size={20} color={c.primaryText} />
          <Text variant="labelLg">Why you missed</Text>
        </Row>
        <Text variant="bodyMd">
          {topReason
            ? `${topReason.count} of ${s.misses} misses: ${label(topReason.obstacle)}.`
            : `${s.misses} ${s.misses === 1 ? 'miss' : 'misses'}, no reason noted yet.`}
          {pattern ? ` ${pattern}` : ''}
        </Text>
        {s.reasons.length > 1 ? (
          <Text variant="bodySm" tone="secondary">
            Also: {s.reasons.slice(1, 4).map((r) => `${label(r.obstacle)} (${r.count})`).join(', ')}
          </Text>
        ) : null}
        {s.byHabit.length > 1 ? (
          <Text variant="bodySm" tone="secondary">
            Most misses: {s.byHabit.slice(0, 2).map((h) => `${h.habit.title} (${h.misses})`).join(', ')}
          </Text>
        ) : null}
        <Row align="flex-start" gap={spacing.sm}>
          <Icon name="lightbulb-outline" size={18} color={c.sage} />
          <Text variant="bodySm" tone="secondary" style={{ flex: 1 }}>
            {topReason
              ? TRY[topReason.obstacle]
              : todLabel && todLabel !== 'morning'
                ? `Your ${todLabel} habits slip most. Moving one to the morning may help.`
                : 'After a miss, tap Reflect to note what got in the way. It adds up here.'}
          </Text>
        </Row>
      </Stack>
    </Card>
  );
}
