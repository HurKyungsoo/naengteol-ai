import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMonthDay, isPerishable } from '@/lib/expiry';
import { getMissingIds } from '@/lib/photoSession';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';

type Choice = 'used' | 'keep';

/**
 * 칸별로 찍었는데 사진에 안 보인 냉장고 재료를 모아 "다 썼어요?"를 묻는다.
 * 재료를 넣는 것보다 다 쓴 재료를 빼는 게 더 귀찮아서, 찍을 때마다 목록을 실제 냉장고와 맞춘다.
 */
export default function ScanCheckScreen() {
  const { pantry, removeIngredient } = useAppState();
  const [ids] = useState(getMissingIds);
  const items = pantry.filter((p) => ids.includes(p.id));
  // 빨리 상하는 재료는 안 보이면 다 썼을 가능성이 높다. 오래 두는 재료(양념·양파 등)는
  // 서랍이나 실온에 있어서 안 찍혔을 수 있으니 실수로 지우지 않게 "있어요"로 둔다.
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(items.map((p) => [p.id, isPerishable(p.name) ? 'used' : 'keep'])),
  );
  const used = items.filter((p) => choices[p.id] === 'used');

  const done = () => {
    used.forEach((p) => removeIngredient(p.id));
    router.replace('/preferences');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="냉장고 점검" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>사진에 안 보였어요.{'\n'}다 쓰셨나요?</Text>
        <Text style={styles.sub}>냉장고 목록에는 있는데 이번 사진에서 못 찾은 재료예요.</Text>

        <View style={styles.list}>
          {items.map((p) => {
            const choice = choices[p.id];
            const set = (c: Choice) => setChoices((prev) => ({ ...prev, [p.id]: c }));
            return (
              <View key={p.id} style={styles.row}>
                <IngredientIcon name={p.name} size={36} tile />
                <View style={styles.rowText}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>
                    {isPerishable(p.name) ? `${formatMonthDay(p.addedAt)}에 넣음` : '오래 두는 재료'}
                  </Text>
                </View>
                <View style={styles.seg} accessibilityRole="radiogroup">
                  <Pressable
                    style={[styles.segItem, choice === 'used' && styles.segUsed]}
                    onPress={() => set('used')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: choice === 'used' }}>
                    <Text style={[styles.segText, choice === 'used' && styles.segTextUsed]}>다 썼어요</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segItem, choice === 'keep' && styles.segKeep]}
                    onPress={() => set('keep')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: choice === 'keep' }}>
                    <Text style={[styles.segText, choice === 'keep' && styles.segTextKeep]}>있어요</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.why}>
          서랍이나 실온에 두는 재료는 안 찍혔을 수 있어서, 오래 두는 재료는 기본으로 ‘있어요’로 뒀어요.
        </Text>
      </ScrollView>
      <BottomBar>
        <PrimaryButton label="건너뛰기" variant="light" onPress={() => router.replace('/preferences')} />
        <PrimaryButton label={used.length > 0 ? `${used.length}개 빼고 완료` : '완료'} onPress={done} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  sub: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSoft,
  },
  list: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  seg: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  segItem: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  segUsed: {
    backgroundColor: colors.ink,
  },
  segKeep: {
    backgroundColor: colors.surface,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
  },
  segText: {
    fontSize: 12,
    color: colors.textSoft,
  },
  segTextUsed: {
    color: colors.onInk,
    fontWeight: '700',
  },
  segTextKeep: {
    color: colors.text,
    fontWeight: '700',
  },
  why: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
  },
});
