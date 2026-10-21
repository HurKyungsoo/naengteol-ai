import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecipeListItem } from '@/components/RecipeListItem';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FilterPills } from '@/components/Tabs';
import { matchesTab, pantryNameSet, recommendRecipes } from '@/lib/recommend';
import { useVideoIndex } from '@/lib/video';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import { CUISINES, DIETS, type Cuisine, type Preferences } from '@/types';

// 'video'는 참고 영상이 있는 레시피만 보여 준다.
type Tab = 'all' | 'video' | Cuisine;

export default function RecipesScreen() {
  const { pantry, preferences, setPreferences } = useAppState();
  const { recipes } = useRecipes();
  const [tab, setTab] = useState<Tab>('all');
  const videos = useVideoIndex();

  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);
  const matches = useMemo(() => recommendRecipes(recipes, pantry, preferences), [recipes, pantry, preferences]);
  const visible = matches.filter((m) =>
    tab === 'video' ? videos.has(m.recipe.id) : matchesTab(m.recipe, tab === 'all' ? undefined : tab),
  );

  // 지금 걸린 조건을 칩으로 보여 주고, ✕로 바로 뺄 수 있게 한다.
  const unset = (patch: Partial<Preferences>) => setPreferences({ ...preferences, ...patch });
  const excluded = preferences.excluded ?? [];
  const chips: { label: string; onRemove: () => void }[] = [
    ...(preferences.diet
      ? [{ label: DIETS.find((d) => d.id === preferences.diet)?.label ?? preferences.diet, onRemove: () => unset({ diet: undefined }) }]
      : []),
    ...(preferences.maxMinutes
      ? [{ label: `${preferences.maxMinutes}분 이내`, onRemove: () => unset({ maxMinutes: undefined }) }]
      : []),
    ...(preferences.difficulty ? [{ label: preferences.difficulty, onRemove: () => unset({ difficulty: undefined }) }] : []),
    ...(preferences.servings ? [{ label: preferences.servings, onRemove: () => unset({ servings: undefined }) }] : []),
    ...(preferences.preferOwned ? [{ label: '냉장고 재료만', onRemove: () => unset({ preferOwned: false }) }] : []),
  ];

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
              options={[
                { value: 'all' as Tab, label: '전체' },
                ...(videos.size > 0 ? [{ value: 'video' as Tab, label: '▶ 영상' }] : []),
                ...CUISINES.map((c) => ({ value: c as Tab, label: c })),
              ]}
              value={tab}
              onChange={setTab}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conditions}>
              <Pressable
                style={({ pressed }) => [styles.condEdit, pressed && styles.pressed]}
                onPress={() => router.push('/preferences')}
                accessibilityRole="button"
                accessibilityLabel="추천 조건 바꾸기">
                <Ionicons name="options-outline" size={15} color={colors.text} />
                <Text style={styles.condEditText}>조건</Text>
              </Pressable>
              {chips.map((c) => (
                <Pressable
                  key={c.label}
                  style={({ pressed }) => [styles.condChip, pressed && styles.pressed]}
                  onPress={c.onRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label} 조건 빼기`}>
                  <Text style={styles.condChipText}>{c.label}</Text>
                  <Ionicons name="close" size={13} color={colors.onInk} />
                </Pressable>
              ))}
              {excluded.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.condExcluded, pressed && styles.pressed]}
                  onPress={() => router.push('/preferences')}
                  accessibilityRole="button">
                  <Text style={styles.condExcludedText}>
                    {excluded[0]}
                    {excluded.length > 1 ? ` 외 ${excluded.length - 1}개` : ''} 제외
                  </Text>
                </Pressable>
              )}
              {chips.length === 0 && excluded.length === 0 && <Text style={styles.condNone}>조건 없이 모든 레시피</Text>}
            </ScrollView>
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
        renderItem={({ item }) => <RecipeListItem recipe={item.recipe} owned={owned} soon={item.soon} />}
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
    alignItems: 'center',
    gap: 6,
  },
  condEdit: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  condEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  condChip: {
    height: 32,
    paddingLeft: spacing.md,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  condChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onInk,
  },
  condExcluded: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#FFF6F1',
    justifyContent: 'center',
  },
  condExcludedText: {
    fontSize: 13,
    color: '#C2360C',
  },
  condNone: {
    fontSize: 13,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
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
