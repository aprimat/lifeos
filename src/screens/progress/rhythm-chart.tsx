import { View } from 'react-native';

import { Text } from '@/components/text';
import { useColors } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme/tokens';

export interface RhythmColumn {
  label: string;
  planned: number;
  done: number;
  rest?: boolean;
  future?: boolean;
}

/** Planned (track) vs done (fill) columns. Rest days show a quiet sage stub. */
export function RhythmChart({ columns, height = 110 }: { columns: RhythmColumn[]; height?: number }) {
  const c = useColors();
  const max = Math.max(1, ...columns.map((col) => Math.max(col.planned, col.done)));
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {columns.map((col, i) => {
          const plannedH = col.planned ? (col.planned / max) * height : 0;
          const doneH = (Math.min(col.done, Math.max(col.planned, col.done)) / max) * height;
          return (
            <View
              key={i}
              accessibilityLabel={`${col.label}: ${col.rest && !col.planned ? 'rest' : `${col.done} of ${col.planned}`}`}
              style={{ flex: 1, height, justifyContent: 'flex-end', alignItems: 'center' }}>
              {col.rest && !col.planned ? (
                <View style={{ width: '70%', height: 10, borderRadius: radius.sm, backgroundColor: c.sageSoft }} />
              ) : (
                <View
                  style={{
                    width: '70%',
                    height: Math.max(plannedH, doneH, 4),
                    borderRadius: radius.sm,
                    backgroundColor: c.track,
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                    opacity: col.future ? 0.5 : 1,
                  }}>
                  <View style={{ height: doneH, backgroundColor: col.done >= col.planned && col.planned > 0 ? c.primary : c.sage, borderRadius: radius.sm }} />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {columns.map((col, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="labelSm" tone="tertiary">
              {col.label}
            </Text>
            <Text variant="labelSm" tone="tertiary" tabular>
              {col.planned ? `${col.done}/${col.planned}` : col.rest ? 'rest' : '–'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
