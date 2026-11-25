import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Group, ListRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { useToday } from '@/hooks/use-data';
import { StepSheet } from '@/screens/goals/step-sheet';
import { useColors } from '@/hooks/use-theme';
import { tapHaptic } from '@/services/haptics';
import { fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const c = useColors();
  const [addOpen, setAddOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const today = useToday();
  const add = (path: '/habit/new' | '/goal/new') => {
    setAddOpen(false);
    router.push(path);
  };
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primaryText,
          tabBarInactiveTintColor: c.textTertiary,
          tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
          tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
          sceneStyle: { backgroundColor: c.background },
        }}>
        <Tabs.Screen
          name="today"
          options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="wb-sunny" color={color as string} size={24} /> }}
        />
        <Tabs.Screen
          name="habits"
          options={{ title: 'Habits', tabBarIcon: ({ color }) => <Icon name="repeat" color={color as string} size={24} /> }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add a habit, goal or step"
                  testID="tab-add"
                  hitSlop={8}
                  onPress={() => {
                    tapHaptic();
                    setAddOpen(true);
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <Icon name="add" size={24} color={c.onPrimary} />
                </Pressable>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{ title: 'Goals', tabBarIcon: ({ color }) => <Icon name="flag" color={color as string} size={24} /> }}
        />
        <Tabs.Screen
          name="progress"
          options={{ title: 'Progress', tabBarIcon: ({ color }) => <Icon name="insights" color={color as string} size={24} /> }}
        />
      </Tabs>
      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add">
        <Group>
          <ListRow icon="repeat" title="New habit" subtitle="Something you repeat" onPress={() => add('/habit/new')} />
          <ListRow icon="flag" title="New goal" subtitle="A result you want" onPress={() => add('/goal/new')} />
          <ListRow
            icon="flag-circle"
            title="New step"
            subtitle="A one-off action for a goal"
            onPress={() => {
              setAddOpen(false);
              // Let the Add sheet slide away before the step sheet opens (two sheets can't open at once).
              setTimeout(() => setStepOpen(true), 260);
            }}
          />
        </Group>
      </Sheet>
      <StepSheet visible={stepOpen} onClose={() => setStepOpen(false)} defaultDate={today} />
    </>
  );
}
