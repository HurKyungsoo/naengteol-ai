import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuideSection } from '@/components/GuideSection';
import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { useRecipeGuide } from '@/lib/guide';
import { hasIngredient } from '@/lib/ingredients';
import { formatMinutes, matchRecipe, pantryNameSet } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, shadow, spacing } from '@/theme';
import type { Nutrition, RecipeIngredient } from '@/types';

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findRecipe } = useRecipes();
  const recipe = findRecipe(id);
  const { pantry, favorites, toggleFavorite, markViewed } = useAppState();

  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);
  const match = useMemo(() => (recipe ? matchRecipe(recipe, owned) : undefined), [recipe, owned]);
  const guide = useRecipeGuide(recipe);

  useEffect(() => {
    if (recipe) markViewed(recipe.id);
    // markViewed는 상태가 바뀔 때마다 새로 만들어지므로 레시피가 바뀔 때만 기록한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  if (!recipe || !match) {
    return (
      <View style={styles.screen}>
        <ScreenHeader />
        <Text style={styles.notFound}>레시피를 찾을 수 없어요.</Text>
      </View>
    );
  }

  const isFavorite = favorites.includes(recipe.id);
  const main = recipe.ingredients.filter((i) => !i.seasoning);
  const seasonings = recipe.ingredients.filter((i) => i.seasoning);

  const share = async () => {
    const lines = [
      `[냉털AI] ${recipe.title} (${formatMinutes(recipe)} · ${recipe.difficulty})`,
      `재료: ${main.map((i) => `${i.name} ${i.amount}`).join(', ')}`,
      ...recipe.steps.map((s, i) => `${i + 1}. ${s.text}`),
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // 공유를 지원하지 않는 환경(일부 웹 브라우저)에서는 무시한다.
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <RecipeImage recipe={recipe} width="100%" height={280 + insets.top} radius={0} size="full" />
          <View style={[styles.heroBar, { top: insets.top + spacing.sm }]}>
            <CircleButton icon="chevron-back" label="뒤로" onPress={goBack} />
            <View style={styles.heroRight}>
              <CircleButton
                icon={isFavorite ? 'heart' : 'heart-outline'}
                color={isFavorite ? colors.heart : colors.text}
                label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                onPress={() => toggleFavorite(recipe.id)}
              />
              <CircleButton icon="share-outline" label="공유" onPress={share} />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.meta}>
            <Meta icon="time-outline" text={formatMinutes(recipe)} />
            <Meta icon="bar-chart-outline" text={recipe.difficulty} />
            <Meta icon="person-outline" text={`${recipe.servings}인분`} />
          </View>
          <Text style={styles.summary}>{recipe.summary}</Text>
          {guide.available && (
            <GuideSection guide={guide.guide} loading={guide.loading} error={guide.error} onRequest={guide.request} />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>필요한 재료</Text>
            <View style={styles.legend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>보유 재료</Text>
            </View>
          </View>
          <View style={styles.card}>
            {main.map((i) => (
              <IngredientRow key={i.name} ingredient={i} owned={hasIngredient(owned, i.name)} />
            ))}
          </View>

          {match.missing.length > 0 && (
            <Pressable
              style={styles.missing}
              onPress={() => router.push({ pathname: '/recipe/[id]/substitutes', params: { id: recipe.id } })}>
              <Ionicons name="swap-horizontal" size={16} color={colors.accent} />
              <Text style={styles.missingText}>
                부족한 재료 {match.missing.length}개 · 대체 재료 보기
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          )}

          {seasonings.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, styles.subSection]}>추가 재료</Text>
              <View style={styles.card}>
                {seasonings.map((i) => (
                  <IngredientRow key={i.name} ingredient={i} owned={hasIngredient(owned, i.name)} subtle />
                ))}
              </View>
            </>
          )}

          {recipe.nutrition && <NutritionCard nutrition={recipe.nutrition} />}

          {recipe.tip && (
            <>
              <Text style={[styles.sectionTitle, styles.subSection]}>저감 조리 팁</Text>
              <View style={styles.tipCard}>
                <Ionicons name="leaf-outline" size={16} color={colors.success} />
                <Text style={styles.tipText}>{recipe.tip}</Text>
              </View>
            </>
          )}

          {recipe.source === 'foodsafety' && (
            <Text style={styles.source}>
              레시피·영양정보 출처: 식품의약품안전처 식품안전나라{'\n'}
              조리 시간과 난이도는 원본에 없어 추정한 값이에요.
            </Text>
          )}
        </View>
      </ScrollView>
      <BottomBar>
        <PrimaryButton
          label="레시피 시작하기"
          onPress={() => router.push({ pathname: '/recipe/[id]/cook', params: { id: recipe.id } })}
        />
      </BottomBar>
    </View>
  );
}

function CircleButton({
  icon,
  label,
  onPress,
  color = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable style={styles.circle} onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

const NUTRIENTS: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
];

/** 원본 데이터에 있는 값만 보여준다. 근거 없는 값은 만들지 않는다 (기획서 7-2). */
function NutritionCard({ nutrition }: { nutrition: Nutrition }) {
  const items = NUTRIENTS.filter((n) => nutrition[n.key] !== undefined);
  if (items.length === 0) return null;
  return (
    <>
      <View style={[styles.sectionHeader, styles.subSection]}>
        <Text style={styles.sectionTitle}>영양정보</Text>
        <Text style={styles.nutritionBasis}>
          1인분{nutrition.weight ? ` ${Math.round(nutrition.weight)}g` : ''} 기준
        </Text>
      </View>
      <View style={styles.nutrition}>
        {items.map((n) => (
          <View key={n.key} style={styles.nutrient}>
            <Text style={styles.nutrientValue}>
              {Math.round(nutrition[n.key] as number)}
              <Text style={styles.nutrientUnit}>{n.unit}</Text>
            </Text>
            <Text style={styles.nutrientLabel}>{n.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function IngredientRow({
  ingredient,
  owned,
  subtle = false,
}: {
  ingredient: RecipeIngredient;
  owned: boolean;
  subtle?: boolean;
}) {
  return (
    <View style={styles.ingredient}>
      <IngredientIcon name={ingredient.name} size={24} />
      <Text style={styles.ingredientName}>{ingredient.name}</Text>
      {ingredient.optional && <Text style={styles.optional}>선택</Text>}
      {!subtle && (owned ? <View style={styles.ownedDot} /> : <Text style={styles.lack}>부족</Text>)}
      <View style={styles.spacer} />
      <Text style={styles.amount}>{ingredient.amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFound: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    color: colors.textMuted,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  heroBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.soft,
  },
  body: {
    marginTop: -24,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summary: {
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSoft,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSoft,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ingredientName: {
    fontSize: 14,
    color: colors.text,
  },
  optional: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ownedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  lack: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  spacer: {
    flex: 1,
  },
  amount: {
    fontSize: 14,
    color: colors.textSoft,
  },
  missing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  missingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  nutritionBasis: {
    fontSize: 12,
    color: colors.textMuted,
  },
  nutrition: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  nutrient: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nutrientUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
  },
  nutrientLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tipCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  source: {
    marginTop: spacing.xl,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
