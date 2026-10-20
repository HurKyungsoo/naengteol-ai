import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'dark' | 'light';
};

export function PrimaryButton({ label, onPress, disabled, variant = 'dark' }: Props) {
  const dark = variant === 'dark';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        dark ? styles.dark : styles.light,
        (pressed || disabled) && styles.dim,
      ]}>
      <Text style={[styles.label, !dark && styles.lightLabel]}>{label}</Text>
    </Pressable>
  );
}

/** 화면 하단에 고정되는 버튼 영역 */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dark: {
    backgroundColor: colors.ink,
  },
  light: {
    backgroundColor: colors.surfaceMuted,
  },
  dim: {
    opacity: 0.6,
  },
  label: {
    color: colors.onInk,
    fontSize: 16,
    fontWeight: '700',
  },
  lightLabel: {
    color: colors.text,
  },
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
});
