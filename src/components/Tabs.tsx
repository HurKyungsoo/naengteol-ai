import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** 밑줄 탭 (직접 입력 / 사진으로 등록 / 최근 사용) */
export function SegmentTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segmentItem, active && styles.segmentItemActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 검정 알약 필터 (전체 / 한식 / 양식 / 간식) */
export function FilterPills<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.pillActive]}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  segmentItemActive: {
    borderBottomColor: colors.ink,
  },
  segmentText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  pills: {
    gap: spacing.sm,
  },
  pill: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.ink,
  },
  pillText: {
    fontSize: 14,
    color: colors.textSoft,
  },
  pillTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
});
