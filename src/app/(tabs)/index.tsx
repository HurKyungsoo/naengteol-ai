import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { RecipeImage } from '@/components/RecipeImage';
import { DotsIcon } from '@/components/ScreenHeader';
import { recommendRecipes } from '@/lib/recommend';
import { formatDuration, useVideoIndex, videoThumbnail } from '@/lib/video';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import { DIETS, type Diet, type Recipe } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { pantry, recentViewed, preferences, addIngredient, setPreferences } = useAppState();
  const { recipes, findRecipe } = useRecipes();
  const [text, setText] = useState('');

  const recent = recentViewed.flatMap((id) => findRecipe(id) ?? []);
  const suggested = useMemo(
    () => recommendRecipes(recipes, pantry, { preferOwned: true }).map((m) => m.recipe),
    [recipes, pantry],
  );
  const shelf: Recipe[] = recent.length > 0 ? recent : suggested.length > 0 ? suggested : recipes;

  // 영상이 있는 레시피: 내 재료로 만들 수 있는 것부터. 영상이 적을 때는 줄을 숨긴다.
  const videos = useVideoIndex();
  const videoShelf = useMemo(() => {
    const ordered = [...suggested, ...recipes];
    const seen = new Set<string>();
    return ordered.filter((r) => videos.has(r.id) && !seen.has(r.id) && seen.add(r.id)).slice(0, 8);
  }, [suggested, recipes, videos]);

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
          <Ionicons name="heart-outline" size={22} color={colors.text} />
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

      {pantry.length > 0 ? (
        <Pressable style={styles.pantryLink} onPress={() => router.navigate('/pantry')}>
          <Text style={styles.pantryLinkText} numberOfLines={1}>
            {`내 냉장고 ${pantry.length}개 · ${pantry
              .slice(0, 3)
              .map((p) => p.name)
              .join(', ')}${pantry.length > 3 ? ' …' : ''}`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>
      ) : (
        <WelcomeCard onQuickAdd={(name) => addIngredient(name)} />
      )}

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

      {videoShelf.length >= 4 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>영상으로 따라 하기</Text>
            <Pressable onPress={() => router.navigate('/recipes')} hitSlop={8} style={styles.more}>
              <Text style={styles.moreText}>더보기</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {videoShelf.map((r) => {
              const video = videos.get(r.id)!;
              return (
                <Pressable
                  key={r.id}
                  style={styles.videoItem}
                  onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}>
                  <View style={styles.videoThumb}>
                    <Image source={{ uri: videoThumbnail(video.videoId) }} style={styles.videoImage} resizeMode="cover" />
                    <View style={styles.videoPlay}>
                      <Ionicons name="play" size={14} color="#fff" style={styles.videoPlayIcon} />
                    </View>
                    <Text style={styles.videoDuration}>{formatDuration(video.durationS)}</Text>
                  </View>
                  <Text style={styles.shelfTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const QUICK_ADD = ['계란', '양파', '두부', '대파'];

/** 냉장고가 비어 있을 때(첫 실행) 검색창 아래에 보여 주는 안내 카드. 재료가 생기면 사라진다. */
function WelcomeCard({ onQuickAdd }: { onQuickAdd: (name: string) => void }) {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeStickers} pointerEvents="none">
        <IngredientIcon icon="tomato" size={52} style={styles.welcomeTomato} />
        <IngredientIcon icon="egg" size={42} style={styles.welcomeEgg} />
      </View>
      <Text style={styles.welcomeEyebrow}>처음 오셨네요</Text>
      <Text style={styles.welcomeTitle}>냉장고 재료부터{'\n'}등록해 볼까요?</Text>
      <Text style={styles.welcomeBody}>사진 한 장이면 AI가 재료를 찾아 줘요.</Text>
      <Pressable
        style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}
        onPress={() => router.push('/camera')}
        accessibilityRole="button">
        <Ionicons name="camera-outline" size={18} color={colors.onInk} />
        <Text style={styles.welcomeButtonText}>사진으로 등록</Text>
      </Pressable>
      <View style={styles.quickRow}>
        {QUICK_ADD.map((name) => (
          <Pressable
            key={name}
            style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
            onPress={() => onQuickAdd(name)}
            accessibilityRole="button"
            accessibilityLabel={`${name} 추가`}>
            <Text style={styles.quickChipText}>+ {name}</Text>
          </Pressable>
        ))}
      </View>
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
  welcome: {
    marginTop: spacing.lg,
    padding: spacing.xl - 4,
    gap: 6,
    borderRadius: radius.xl - 4,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
  },
  welcomeStickers: {
    position: 'absolute',
    top: 12,
    right: 10,
    width: 110,
    height: 90,
  },
  welcomeTomato: {
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ rotate: '10deg' }],
  },
  welcomeEgg: {
    position: 'absolute',
    right: 50,
    top: 34,
    transform: [{ rotate: '-12deg' }],
  },
  welcomeEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8461A',
  },
  welcomeTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.text,
  },
  welcomeBody: {
    fontSize: 13,
    color: colors.textSoft,
  },
  welcomeButton: {
    marginTop: spacing.sm,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  welcomeButtonText: {
    color: colors.onInk,
    fontSize: 15,
    fontWeight: '700',
  },
  quickRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  quickChip: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 13,
    color: colors.text,
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
  videoItem: {
    width: 168,
    gap: 6,
  },
  videoThumb: {
    width: 168,
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 웹에서 absoluteFill만 주면 확대돼 잘리므로 크기를 직접 준다 (RecipeImage와 같음)
  videoImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  videoPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    marginLeft: 2,
  },
  videoDuration: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
