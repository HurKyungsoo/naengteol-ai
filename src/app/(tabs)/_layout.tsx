import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, activeName: IconName) {
  return function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return (
      <Ionicons name={focused ? activeName : name} size={22} color={typeof color === 'string' ? color : undefined} />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="recipes" options={{ title: '레시피', tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen
        name="pantry"
        options={{ title: '재료', tabBarIcon: icon('nutrition-outline', 'nutrition') }}
      />
      <Tabs.Screen name="my" options={{ title: '마이', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
