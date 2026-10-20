import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { RecipeImage } from '@/components/RecipeImage';
import { DotsIcon } from '@/components/ScreenHeader';
import { findRecipe, RECIPES } from '@/data/recipes';
import { recommendRecipes } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import { DIETS, type Diet, type Recipe } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { pantry, recentViewed, preferences, addIngredient, setPreferences } = useAppState();
  const [text, setText] = useState('');

  const recent = recentViewed.flatMap((id) => findRecipe(id) ?? []);
  const suggested = useMemo(
    () => recommendRecipes(RECIPES, pantry, { preferOwned: true }).map((m) => m.recipe),
    [pantry],
  );
  const shelf: Recipe[] = recent.length > 0 ? recent : suggested.length > 0 ? suggested : RECIPES;

  const submit = () => {
    const names = text.split(/[,\s]+/).filter(Boolean);
    if (names.length === 0) {
      router.push('/ingredients/add');
      return;
    }
    names.forEach((n) => addIngredient(n));
    setText('');
    router.push('/preferences');
  };

  const pickDiet = (diet: Diet) => {
    setPreferences({ ...preferences, diet });
    router.navigate('/recipes');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/preferences')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="추천 조건 설정">
          <DotsIcon />
        </Pressable>
        <Pressable
          onPress={() => router.push('/favorites')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="즐겨찾기">
          <Ionicons name="refresh" size={21} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.title}>오늘은 어떤 요리를{'\n'}해볼까요?</Text>
      <Text style={styles.subtitle}>냉장고 속 재료로 간편하게{'\n'}레시피를 찾아보세요.</Text>

      <View style={styles.search}>
        <Pressable onPress={() => router.push('/camera')} hitSlop={8} accessibilityLabel="사진으로 재료 찾기">
          <Ionicons name="camera-outline" size={20} color={colors.textSoft} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="재료를 입력하거나 사진을 올려보세요"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={submit}
        />
        <Pressable onPress={submit} style={styles.searchButton} accessibilityLabel="재료로 레시피 찾기">
          <Ionicons name="arrow-forward" size={18} color={colors.onInk} />
        </Pressable>
      </View>

      <Pressable style={styles.pantryLink} onPress={() => router.navigate('/pantry')}>
        <Text style={styles.pantryLinkText} numberOfLines={1}>
          {pantry.length > 0
            ? `내 냉장고 ${pantry.length}개 · ${pantry
                .slice(0, 3)
                .map((p) => p.name)
                .join(', ')}${pantry.length > 3 ? ' …' : ''}`
            : '냉장고가 비어 있어요. 재료를 등록해 보세요'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>

      <View style={styles.grid}>
        {DIETS.map((d) => (
          <Pressable key={d.id} style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={() => pickDiet(d.id)}>
            <IngredientIcon icon={d.icon} size={36} />
            <Text style={styles.gridLabel}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {recent.length > 0 ? '최근 본 레시피' : '이런 요리는 어때요?'}
        </Text>
        <Pressable onPress={() => router.navigate('/recipes')} hitSlop={8} style={styles.more}>
          <Text style={styles.moreText}>더보기</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
        {shelf.slice(0, 8).map((r) => (
          <Pressable
            key={r.id}
            style={styles.shelfItem}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}>
            <RecipeImage recipe={r} width={112} height={96} radius={radius.md} />
            <Text style={styles.shelfTitle} numberOfLines={1}>
              {r.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    height: 52,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.text,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pantryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  pantryLinkText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textSoft,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  gridItem: {
    width: '31.5%',
    flexGrow: 1,
    aspectRatio: 1.25,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  gridLabel: {
    fontSize: 13,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  shelf: {
    gap: spacing.md,
  },
  shelfItem: {
    width: 112,
    gap: 6,
  },
  shelfTitle: {
    fontSize: 13,
    color: colors.text,
  },
});
