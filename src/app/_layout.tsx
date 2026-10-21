import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Intro } from '@/components/Intro';
import { useExpiryNotifications } from '@/lib/useExpiryNotifications';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { RecipesProvider } from '@/state/RecipesProvider';
import { colors } from '@/theme';

function AppShell() {
  const { loaded, pantry, profile } = useAppState();
  useExpiryNotifications(pantry, profile.notifications, loaded);
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
      <Intro ready={loaded} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RecipesProvider>
        <StatusBar style="dark" />
        <AppShell />
      </RecipesProvider>
    </AppStateProvider>
  );
}
