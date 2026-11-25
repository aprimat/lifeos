import { View } from 'react-native';

import { IconButton } from '@/components/button';
import { Card, Row } from '@/components/card';
import { CheckCircle } from '@/components/controls';
import { Text } from '@/components/text';
import { setStepDone } from '@/data/actions';
import { formatShortDay, minDate } from '@/domain/dates';
import type { DayStep } from '@/domain/steps';
import type { ISODate } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { spacing } from '@/theme/tokens';

/** A step on Today: tick / untick, its goal (and "from Mon" if it's carried over), ⋯ to edit. */
export function StepRow({ item, today, day, onEdit }: { item: DayStep; today: ISODate; day: ISODate; onEdit: () => void }) {
  const c = useColors();
  const { step, goal, from } = item;
  const done = !!step.doneAt;
  return (
    <Card padding={spacing.md}>
      <Row gap={spacing.md}>
        <CheckCircle
          state={done ? 'done' : 'idle'}
          label={`${step.title}${done ? ', done' : ''}`}
          // Done on the day shown (a carried-over step counts on the day you tick it), never in the future.
          onPress={() => setStepDone(step.id, !done, minDate(day, today))}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyLg" numberOfLines={1} strike={done} tone={done ? 'secondary' : 'primary'}>
            {step.title}
          </Text>
          <Text variant="bodySm" tone="tertiary" numberOfLines={1}>
            {goal.title}
            {from && !done ? <Text variant="bodySm" color={c.amber}>{` · from ${formatShortDay(from)}`}</Text> : null}
          </Text>
        </View>
        <IconButton icon="more-horiz" accessibilityLabel={`More options for ${step.title}`} onPress={onEdit} size={44} />
      </Row>
    </Card>
  );
}
