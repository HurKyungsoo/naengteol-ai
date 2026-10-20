import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipeListItem } from '@/components/RecipeListItem';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FilterPills } from '@/components/Tabs';
import { matchesTab, pantryNameSet, recommendRecipes } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import { CUISINES, DIETS, type Cuisine } from '@/types';

type Tab = 'all' | Cuisine;

export default function RecipesScreen() {
  const { pantry, preferences } = useAppState();
  const { recipes } = useRecipes();
  const [tab, setTab] = useState<Tab>('all');

  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);
  const matches = useMemo(() => recommendRecipes(recipes, pantry, preferences), [recipes, pantry, preferences]);
  const visible = matches.filter((m) => matchesTab(m.recipe, tab === 'all' ? undefined : tab));

  const conditions = [
    preferences.diet && DIETS.find((d) => d.id === preferences.diet)?.label,
    preferences.maxMinutes && `${preferences.maxMinutes}분 이내`,
    preferences.difficulty,
    preferences.servings,
  ].filter(Boolean);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="추천 레시피" back={false} />
      <FlatList
        data={visible}
        keyExtractor={(m) => m.recipe.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <FilterPills
              options={[{ value: 'all' as Tab, label: '전체' }, ...CUISINES.map((c) => ({ value: c as Tab, label: c }))]}
              value={tab}
              onChange={setTab}
            />
            <Pressable style={styles.conditions} onPress={() => router.push('/preferences')}>
              <Ionicons name="options-outline" size={16} color={colors.textSoft} />
              <Text style={styles.conditionsText} numberOfLines={1}>
                {conditions.length > 0 ? conditions.join(' · ') : '조건 없이 모든 레시피'}
                {preferences.preferOwned ? ' · 보유 재료 우선' : ''}
              </Text>
              <Text style={styles.conditionsEdit}>변경</Text>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {pantry.length === 0 && preferences.preferOwned
                ? '냉장고 재료를 먼저 등록해 주세요.'
                : '조건에 맞는 레시피가 없어요.\n조건을 바꾸거나 재료를 더 등록해 보세요.'}
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push(pantry.length === 0 ? '/ingredients/add' : '/preferences')}>
              <Text style={styles.emptyButtonText}>{pantry.length === 0 ? '재료 등록하기' : '조건 바꾸기'}</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <RecipeListItem recipe={item.recipe} owned={owned} />}
      />
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
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  conditions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  conditionsText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSoft,
  },
  conditionsEdit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  emptyButton: {
    height: 42,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: colors.onInk,
    fontWeight: '700',
  },
});
