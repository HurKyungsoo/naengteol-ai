import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Intro } from '@/components/Intro';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { colors } from '@/theme';

function AppShell() {
  const { loaded } = useAppState();
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
      <StatusBar style="dark" />
      <AppShell />
    </AppStateProvider>
  );
}
