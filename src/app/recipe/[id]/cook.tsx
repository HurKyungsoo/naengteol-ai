import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bullet } from '@/components/GuideSection';
import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { StepScene } from '@/components/StepScene';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { useRecipeGuide } from '@/lib/guide';
import { STEP_ICONS, stepSubjects, stepHeat, stepIngredients, stepKind, stepTime } from '@/lib/stepInfo';
import { normalizeIngredient, substitutesFor } from '@/lib/ingredients';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import type { Recipe, RecipeStep } from '@/types';

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
                {/* 단계 사진이 있으면 사진, 없으면(샘플 레시피) 동작 아이콘 */}
                {step.image ? (
                  <RecipeImage recipe={recipe} imageUri={step.image} width={72} height={72} radius={radius.md} />
                ) : (
                  <StepTile recipe={recipe} step={step} done={isDone} />
                )}
                <View style={styles.cardBody}>
                  {step.title && <Text style={styles.stepTitle}>{step.title}</Text>}
                  <Text style={styles.stepText}>{step.text}</Text>
                  <StepChips recipe={recipe} step={step} />
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

/** 사진이 없는 단계의 그림. 들어가는 재료가 있으면 "도마 위 썰린 양파·당근"처럼 장면으로, 없으면 동작 아이콘만. */
function StepTile({ recipe, step, done }: { recipe: Recipe; step: RecipeStep; done: boolean }) {
  const kind = stepKind(step);
  const subjects = stepSubjects(recipe, step);
  return (
    <View style={[styles.stepIcon, done && styles.stepIconDone]}>
      {subjects.length > 0 && kind !== 'roll' ? (
        <StepScene kind={kind} ingredients={subjects} size={72} />
      ) : (
        <Image source={STEP_ICONS[kind]} style={styles.stepIconImage} resizeMode="contain" />
      )}
    </View>
  );
}

/** 단계의 핵심 정보: 시간, 불 세기, 들어가는 재료 */
function StepChips({ recipe, step }: { recipe: Recipe; step: RecipeStep }) {
  const time = stepTime(step);
  const heat = stepHeat(step);
  const ingredients = stepIngredients(recipe, step);
  if (!time && !heat && ingredients.length === 0) return null;
  return (
    <View style={styles.stepChips}>
      {time && (
        <View style={[styles.stepChip, styles.timeChip]}>
          <Ionicons name="timer-outline" size={13} color={colors.onInk} />
          <Text style={styles.timeChipText}>{time}</Text>
        </View>
      )}
      {heat && (
        <View style={[styles.stepChip, styles.heatChip]}>
          <Ionicons name="flame-outline" size={13} color="#B8461A" />
          <Text style={styles.heatChipText}>{heat}</Text>
        </View>
      )}
      {ingredients.map((name) => (
        <View key={name} style={[styles.stepChip, styles.ingredientChip]}>
          <IngredientIcon name={name} size={16} />
          <Text style={styles.ingredientChipText}>{name}</Text>
        </View>
      ))}
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
  stepIcon: {
    width: 72,
    height: 72,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: '#FFF4E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconDone: {
    backgroundColor: colors.successSoft,
  },
  stepIconImage: {
    width: 58,
    height: 58,
  },
  stepChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  stepChip: {
    height: 26,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeChip: {
    backgroundColor: colors.ink,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onInk,
  },
  heatChip: {
    backgroundColor: colors.accentSoft,
  },
  heatChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A3412',
  },
  ingredientChip: {
    paddingLeft: 5,
    backgroundColor: colors.surface,
  },
  ingredientChipText: {
    fontSize: 12,
    color: colors.text,
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
