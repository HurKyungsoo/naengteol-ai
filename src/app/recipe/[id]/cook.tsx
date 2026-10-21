import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bullet } from '@/components/GuideSection';
import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { useRecipeGuide } from '@/lib/guide';
import { normalizeIngredient, substitutesFor } from '@/lib/ingredients';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';

export default function CookScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findRecipe } = useRecipes();
  const recipe = findRecipe(id);
  const { pantry, completeCooking } = useAppState();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 이 레시피에 쓰였을 가능성이 있는 냉장고 재료 (대체 재료 포함, 양념 제외)
  const usable = useMemo(() => {
    if (!recipe) return [];
    const names = new Set<string>();
    for (const i of recipe.ingredients.filter((x) => !x.seasoning)) {
      names.add(normalizeIngredient(i.name));
      substitutesFor(i.name).forEach((s) => names.add(normalizeIngredient(s)));
    }
    return pantry.filter((p) => names.has(normalizeIngredient(p.name)));
  }, [recipe, pantry]);

  const guide = useRecipeGuide(recipe);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleTips = (index: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  if (!recipe) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
      </View>
    );
  }

  const toggleStep = (index: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const openSheet = () => {
    // 레시피 재료와 이름이 같은 것만 기본으로 체크한다. 대체 재료는 직접 고르도록.
    const exact = new Set(recipe.ingredients.map((i) => normalizeIngredient(i.name)));
    setSelected(new Set(usable.filter((p) => exact.has(normalizeIngredient(p.name))).map((p) => p.id)));
    setSheet(true);
  };

  const finish = (usedIds: string[]) => {
    completeCooking(recipe.id, usedIds);
    setSheet(false);
    router.dismissTo('/');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={recipe.title} />
      <Text style={styles.progress}>
        {done.size}/{recipe.steps.length} 단계 완료 · 단계를 누르면 체크돼요
      </Text>
      <ScrollView contentContainerStyle={styles.content}>
        {guide.available && !guide.guide && (
          <Pressable style={styles.guideRequest} onPress={guide.request} disabled={guide.loading}>
            {guide.loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color={colors.ink} />
            )}
            <Text style={styles.guideRequestText}>
              {guide.loading ? '설명을 만들고 있어요…' : guide.error ?? '단계별 자세한 설명 받기 (AI)'}
            </Text>
          </Pressable>
        )}
        {recipe.steps.map((step, index) => {
          const isDone = done.has(index);
          const last = index === recipe.steps.length - 1;
          const tips = guide.guide?.steps.find((s) => s.index === index + 1)?.tips ?? [];
          const open = expanded.has(index);
          return (
            <Pressable key={index} style={styles.step} onPress={() => toggleStep(index)}>
              <View style={styles.rail}>
                <View style={[styles.number, isDone && styles.numberDone]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color={colors.onInk} />
                  ) : (
                    <Text style={styles.numberText}>{index + 1}</Text>
                  )}
                </View>
                {!last && <View style={styles.line} />}
              </View>
              <View style={[styles.card, isDone && styles.cardDone]}>
                {/* 단계 사진이 있을 때만 보여 준다. 없을 때 완성 사진·아이콘을 반복하면 단계가 구분되지 않는다. */}
                {step.image && (
                  <RecipeImage recipe={recipe} imageUri={step.image} width={72} height={72} radius={radius.md} />
                )}
                <View style={styles.cardBody}>
                  {step.title && <Text style={styles.stepTitle}>{step.title}</Text>}
                  <Text style={styles.stepText}>{step.text}</Text>
                  {tips.length > 0 && (
                    <Pressable
                      onPress={(e) => {
                        // 바깥 단계 카드(누르면 완료 체크)까지 눌리지 않게 한다.
                        e.stopPropagation();
                        toggleTips(index);
                      }}
                      hitSlop={6}
                      style={styles.tipsToggle}>
                      <Text style={styles.tipsToggleText}>{open ? '💡 접기' : '💡 자세히'}</Text>
                    </Pressable>
                  )}
                  {open && (
                    <View style={styles.tips}>
                      {tips.map((t) => (
                        <Bullet key={t} text={t} />
                      ))}
                      <Text style={styles.tipsNote}>AI 보충 설명</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <BottomBar>
        {/* 한 단계도 체크하지 않았으면 기록·재료 정리 없이 나간다 */}
        {done.size === 0 ? (
          <PrimaryButton label="요리 그만하기" variant="light" onPress={goBack} />
        ) : (
          <PrimaryButton label="완료" onPress={openSheet} />
        )}
      </BottomBar>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>맛있게 드세요! 🎉</Text>
          <Text style={styles.sheetDesc}>다 쓴 재료를 고르면 냉장고에서 정리해 드려요.</Text>
          {usable.length === 0 ? (
            <Text style={styles.sheetDesc}>정리할 재료가 없어요.</Text>
          ) : (
            <View style={styles.chips}>
              {usable.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={[styles.chip, checked && styles.chipOn]}>
                    <IngredientIcon name={p.name} size={20} />
                    <Text style={[styles.chipText, checked && styles.chipTextOn]}>{p.name}</Text>
                    {checked && <Ionicons name="checkmark" size={14} color={colors.onInk} />}
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.sheetButtons}>
            <PrimaryButton label="기록만 남기기" variant="light" onPress={() => finish([])} />
            <PrimaryButton
              label={selected.size > 0 ? `${selected.size}개 정리하기` : '완료'}
              onPress={() => finish([...selected])}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progress: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    fontSize: 12,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 26,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  numberDone: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  cardDone: {
    opacity: 0.5,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSoft,
  },
  guideRequest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guideRequestText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tipsToggle: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tipsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  tips: {
    marginTop: 4,
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tipsNote: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sheetDesc: {
    fontSize: 14,
    color: colors.textSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipOn: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  chipTextOn: {
    color: colors.onInk,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
