import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipeImage } from '@/components/RecipeImage';
import { hasIngredient } from '@/lib/ingredients';
import { coreIngredients, formatMinutes } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import type { Recipe } from '@/types';

type Props = {
  recipe: Recipe;
  owned: Set<string>;
  /** 재료 태그 대신 "15분 · 쉬움" 한 줄만 보여준다 (즐겨찾기) */
  compact?: boolean;
};

export function RecipeListItem({ recipe, owned, compact = false }: Props) {
  const { favorites, toggleFavorite } = useAppState();
  const isFavorite = favorites.includes(recipe.id);
  const core = coreIngredients(recipe);
  const missing = core.filter((i) => !hasIngredient(owned, i.name)).length;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <RecipeImage recipe={recipe} width={compact ? 76 : 92} height={compact ? 76 : 92} radius={radius.md} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {recipe.title}
        </Text>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatMinutes(recipe)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{recipe.difficulty}</Text>
          {!compact && (
            <Text style={[styles.status, missing === 0 ? styles.statusReady : styles.statusMissing]}>
              {missing === 0 ? '바로 가능' : `${missing}개 부족`}
            </Text>
          )}
        </View>
        {!compact && (
          <View style={styles.tags}>
            {core.slice(0, 3).map((i) => {
              const has = hasIngredient(owned, i.name);
              return (
                <Text key={i.name} style={[styles.tag, !has && styles.tagMissing]}>
                  {i.name}
                </Text>
              );
            })}
          </View>
        )}
      </View>
      <Pressable
        onPress={() => toggleFavorite(recipe.id)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={isFavorite ? colors.heart : colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  status: {
    marginLeft: spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  statusReady: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
  statusMissing: {
    color: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    color: colors.textSoft,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tagMissing: {
    color: colors.textMuted,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
