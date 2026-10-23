import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radius, spacing } from '@/theme';

/**
 * 화면을 그리다 예상치 못한 오류가 나면 앱이 꺼지는 대신 이 화면을 보여 준다.
 * 냉장고 재료 같은 저장 데이터는 그대로라 [다시 시도]로 대부분 돌아온다.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.title}>잠시 문제가 생겼어요</Text>
        <Text style={styles.desc}>냉장고에 넣은 재료는 그대로 저장돼 있어요.{'\n'}다시 시도해 주세요.</Text>
        {__DEV__ && <Text style={styles.detail}>{error.message}</Text>}
      </View>
      <View style={styles.bottom}>
        <PrimaryButton label="다시 시도" onPress={retry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.textMuted,
  },
  detail: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    fontSize: 12,
    color: colors.textMuted,
  },
  bottom: {
    flexDirection: 'row',
    padding: spacing.xl,
  },
});
