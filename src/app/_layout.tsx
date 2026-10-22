import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Intro } from '@/components/Intro';
import { Onboarding, type OnboardingStart } from '@/components/Onboarding';
import { useExpiryNotifications } from '@/lib/useExpiryNotifications';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { RecipesProvider } from '@/state/RecipesProvider';
import { colors } from '@/theme';

function AppShell() {
  const { loaded, pantry, profile, onboarded, completeOnboarding } = useAppState();
  useExpiryNotifications(pantry, profile.notifications, loaded);
  // 온보딩은 Intro처럼 홈 위에 덮어 보여 준다. 끝나면 그 아래 홈에서 바로 카메라나 재료 등록으로 간다.
  const showOnboarding = loaded && !onboarded;

  const finishOnboarding = (start: OnboardingStart) => {
    completeOnboarding();
    if (start === 'camera') router.push('/camera');
    else router.push({ pathname: '/ingredients/add', params: { focus: '1' } });
  };

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
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
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
