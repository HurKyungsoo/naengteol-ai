import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipeListItem } from '@/components/RecipeListItem';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FilterPills } from '@/components/Tabs';
import { findRecipe } from '@/data/recipes';
import { matchesTab, pantryNameSet } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import type { Cuisine, Diet } from '@/types';

type Tab = 'all' | Cuisine | Diet;

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '한식', label: '한식' },
  { value: '다이어트', label: '다이어트식' },
  { value: '양식', label: '양식' },
  { value: '간식', label: '간식' },
];

export default function FavoritesScreen() {
  const { favorites, pantry } = useAppState();
  const [tab, setTab] = useState<Tab>('all');
  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);

  const recipes = favorites
    .flatMap((id) => findRecipe(id) ?? [])
    .filter((r) => matchesTab(r, tab === 'all' ? undefined : tab));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="즐겨찾기" />
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <FilterPills options={TABS} value={tab} onChange={setTab} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {favorites.length === 0 ? '하트를 누른 레시피가 여기에 모여요.' : '이 분류에는 저장한 레시피가 없어요.'}
            </Text>
            {favorites.length === 0 && (
              <Pressable style={styles.emptyButton} onPress={() => router.navigate('/recipes')}>
                <Text style={styles.emptyButtonText}>레시피 둘러보기</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => <RecipeListItem recipe={item} owned={owned} compact />}
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
    marginBottom: spacing.md,
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
    fontSize: 14,
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
