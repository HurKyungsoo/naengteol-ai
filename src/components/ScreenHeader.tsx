import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '@/theme';

type Props = {
  title?: string;
  /** false면 뒤로 가기 버튼을 숨긴다 (탭 화면) */
  back?: boolean;
  right?: ReactNode;
};

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ScreenHeader({ title, back = true, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {back && (
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        )}
        {title && <Text style={[type.screenTitle, back && styles.titleWithBack]}>{title}</Text>}
        <View style={styles.spacer} />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  titleWithBack: {
    marginLeft: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
});
