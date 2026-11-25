import { router, Tabs } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Group, ListRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { useColors } from '@/hooks/use-theme';
import { tapHaptic } from '@/services/haptics';
import { fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const c = useColors();
  const [addOpen, setAddOpen] = useState(false);
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
                  accessibilityLabel="Add a habit or goal"
                  testID="tab-add"
                  hitSlop={8}
                  onPress={() => {
                    tapHaptic();
                    setAddOpen(true);
                  }}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <Icon name="add" size={28} color={c.onPrimary} />
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
        </Group>
      </Sheet>
    </>
  );
}
