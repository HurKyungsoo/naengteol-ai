import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { ErrorScreen } from '@/components/ErrorScreen';
import { Intro } from '@/components/Intro';
import { Onboarding } from '@/components/Onboarding';
import { useExpiryNotifications } from '@/lib/useExpiryNotifications';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { RecipesProvider } from '@/state/RecipesProvider';
import { colors } from '@/theme';

// 어느 화면에서든 그리다 오류가 나면 앱이 꺼지지 않고 [다시 시도] 화면을 보여 준다.
export const ErrorBoundary = ErrorScreen;

function AppShell() {
  const { loaded, pantry, profile, onboarded, completeOnboarding } = useAppState();
  useExpiryNotifications(pantry, profile.notifications, loaded);
  // 온보딩은 Intro처럼 홈 위에 덮어 보여 준다. [시작하기]를 누르면 그 아래 홈이 그대로 보인다.
  const showOnboarding = loaded && !onboarded;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        importantForAccessibility={showOnboarding ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={showOnboarding}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack>
      </View>
      {showOnboarding && <Onboarding onDone={completeOnboarding} />}
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
