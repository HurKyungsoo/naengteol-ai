import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

/** 냉장고 탭: Ionicons에 냉장고 모양이 없어서 MaterialCommunityIcons를 쓴다 */
function FridgeIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
  return (
    <MaterialCommunityIcons
      name={focused ? 'fridge' : 'fridge-outline'}
      size={23}
      color={typeof color === 'string' ? color : undefined}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="recipes" options={{ title: '레시피', tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen name="pantry" options={{ title: '냉장고', tabBarIcon: FridgeIcon }} />
      <Tabs.Screen name="my" options={{ title: '마이', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
