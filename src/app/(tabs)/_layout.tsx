import { Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { useColors } from '@/hooks/use-theme';
import { fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const c = useColors();
  return (
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
        name="goals"
        options={{ title: 'Goals', tabBarIcon: ({ color }) => <Icon name="flag" color={color as string} size={24} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color }) => <Icon name="insights" color={color as string} size={24} /> }}
      />
    </Tabs>
  );
}
