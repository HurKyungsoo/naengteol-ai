import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { RecipeImage } from '@/components/RecipeImage';
import { DotsIcon } from '@/components/ScreenHeader';
import { hasIngredient } from '@/lib/ingredients';
import { formatMinutes, pantryNameSet, recommendRecipes } from '@/lib/recommend';
import { formatDuration, useVideoIndex, videoThumbnail } from '@/lib/video';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import { DIETS, type Diet, type PantryItem, type Recipe } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { pantry, recentViewed, preferences, addIngredient, setPreferences } = useAppState();
  const { recipes, findRecipe } = useRecipes();
  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);

  const recent = recentViewed.flatMap((id) => findRecipe(id) ?? []);
  const matches = useMemo(() => recommendRecipes(recipes, pantry, { preferOwned: true }), [recipes, pantry]);
  const suggested = useMemo(() => matches.map((m) => m.recipe), [matches]);
  const readyCount = matches.filter((m) => m.missing.length === 0).length;
  // 냉장고에 재료가 있으면 "바로 만들 수 있어요" 줄이 따로 나오므로, 아래 줄은 최근 본 레시피나 전체 레시피를 보여 준다.
  // 냉장고에 재료가 있으면 위에 "바로 만들 수 있어요" 줄이 나오므로, 아래 줄은 최근 본 레시피가 있을 때만 보여 준다.
  const showShelf = pantry.length === 0 || recent.length > 0;
  const shelf: Recipe[] = recent.length > 0 ? recent : recipes;

  // 영상이 있는 레시피: 내 재료로 만들 수 있는 것부터. 영상이 적을 때는 줄을 숨긴다.
  const videos = useVideoIndex();
  const videoShelf = useMemo(() => {
    const ordered = [...suggested, ...recipes];
    const seen = new Set<string>();
    return ordered.filter((r) => videos.has(r.id) && !seen.has(r.id) && seen.add(r.id)).slice(0, 8);
  }, [suggested, recipes, videos]);

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
      {pantry.length === 0 && (
        <Text style={styles.subtitle}>냉장고 속 재료로 간편하게{'\n'}레시피를 찾아보세요.</Text>
      )}

      {/* 홈의 입력창은 재료 등록 화면으로 가는 버튼이다. 입력·자동완성·확인은 그 화면 한 곳에서 한다. */}
      <View style={styles.search}>
        <Pressable onPress={() => router.push('/camera')} hitSlop={8} accessibilityLabel="사진으로 재료 찾기">
          <Ionicons name="camera-outline" size={20} color={colors.textSoft} />
        </Pressable>
        <Pressable
          style={styles.searchField}
          onPress={() => router.push({ pathname: '/ingredients/add', params: { focus: '1' } })}
          accessibilityRole="button"
          accessibilityLabel="재료 입력하기">
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            냉장고 재료를 입력하세요
          </Text>
          <View style={styles.searchButton}>
            <Ionicons name="add" size={20} color={colors.onInk} />
          </View>
        </Pressable>
      </View>

      {pantry.length > 0 && <PantrySummary pantry={pantry} readyCount={readyCount} />}
      {pantry.length < WELCOME_UNTIL && (
        <WelcomeCard count={pantry.length} owned={owned} onQuickAdd={(name) => addIngredient(name)} />
      )}

      {matches.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{readyCount > 0 ? '바로 만들 수 있어요' : '내 재료로 만들어 봐요'}</Text>
            <Pressable onPress={() => router.navigate('/recipes')} hitSlop={8} style={styles.more}>
              <Text style={styles.moreText}>더보기</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {matches.slice(0, 8).map(({ recipe: r, missing }) => (
              <Pressable
                key={r.id}
                style={styles.matchItem}
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}>
                <View>
                  <RecipeImage recipe={r} width={140} height={112} radius={radius.lg - 4} />
                  <Text style={[styles.badge, missing.length === 0 ? styles.badgeReady : styles.badgeMissing]}>
                    {missing.length === 0 ? '바로 가능' : `${missing.length}개 부족`}
                  </Text>
                </View>
                <Text style={styles.matchTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={styles.matchMeta}>
                  {formatMinutes(r)} · {r.difficulty}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {pantry.length === 0 ? (
        <View style={styles.grid}>
          {DIETS.map((d) => (
            <Pressable key={d.id} style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]} onPress={() => pickDiet(d.id)}>
              <IngredientIcon icon={d.icon} size={36} />
              <Text style={styles.gridLabel}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        // 재료가 있으면 추천 줄이 주인공이라 카테고리는 작은 칩 한 줄로 줄인다.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietChips}>
          {DIETS.map((d) => (
            <Pressable key={d.id} style={({ pressed }) => [styles.dietChip, pressed && styles.pressed]} onPress={() => pickDiet(d.id)}>
              <IngredientIcon icon={d.icon} size={18} />
              <Text style={styles.dietChipText}>{d.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {showShelf && (
      <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{recent.length > 0 ? '최근 본 레시피' : '이런 요리는 어때요?'}</Text>
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
      </>
      )}

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

/** 냉장고 현황 카드: 재료 아이콘 몇 개 + 개수 + 바로 만들 수 있는 요리 수. 누르면 재료 관리로 간다. */
function PantrySummary({ pantry, readyCount }: { pantry: PantryItem[]; readyCount: number }) {
  const shown = pantry.slice(0, 3);
  const rest = pantry.length - shown.length;
  return (
    <Pressable
      style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      onPress={() => router.navigate('/pantry')}
      accessibilityRole="button"
      accessibilityLabel={`내 냉장고 ${pantry.length}개, 바로 가능한 요리 ${readyCount}개`}>
      <View style={styles.summaryIcons}>
        {shown.map((p, i) => (
          <View key={p.id} style={[styles.summaryIcon, i > 0 && styles.summaryIconOverlap]}>
            <IngredientIcon name={p.name} size={36} tile />
          </View>
        ))}
        {rest > 0 && (
          <View style={[styles.summaryIcon, styles.summaryIconOverlap, styles.summaryRest]}>
            <Text style={styles.summaryRestText}>+{rest}</Text>
          </View>
        )}
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>내 냉장고 {pantry.length}개</Text>
        <Text style={readyCount > 0 ? styles.summaryReady : styles.summarySub} numberOfLines={1}>
          {readyCount > 0 ? `바로 가능한 요리 ${readyCount}개` : '재료를 더 넣으면 바로 만들 요리가 생겨요'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const QUICK_ADD = ['계란', '양파', '두부', '대파'];
/** 재료가 이만큼 모일 때까지 안내 카드를 보여 준다. 칩을 여러 개 연달아 누를 수 있게 한다. */
const WELCOME_UNTIL = 3;

/** 첫 실행처럼 냉장고 재료가 적을 때 검색창 아래에 보여 주는 안내 카드 */
function WelcomeCard({
  count,
  owned,
  onQuickAdd,
}: {
  count: number;
  owned: Set<string>;
  onQuickAdd: (name: string) => void;
}) {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeStickers} pointerEvents="none">
        <IngredientIcon icon="tomato" size={52} style={styles.welcomeTomato} />
        <IngredientIcon icon="egg" size={42} style={styles.welcomeEgg} />
      </View>
      <Text style={styles.welcomeEyebrow}>
        {count === 0 ? '처음 오셨네요' : `좋아요! ${WELCOME_UNTIL - count}개만 더 넣어 볼까요?`}
      </Text>
      <Text style={styles.welcomeTitle}>
        {count === 0 ? '냉장고 재료부터\n등록해 볼까요?' : '재료가 많을수록\n추천이 정확해져요'}
      </Text>
      <Text style={styles.welcomeBody}>사진 한 장이면 AI가 재료를 찾아 줘요.</Text>
      <Pressable
        style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}
        onPress={() => router.push('/camera')}
        accessibilityRole="button">
        <Ionicons name="camera-outline" size={18} color={colors.onInk} />
        <Text style={styles.welcomeButtonText}>사진으로 등록</Text>
      </Pressable>
      <View style={styles.quickRow}>
        {QUICK_ADD.map((name) => {
          const added = hasIngredient(owned, name);
          return (
            <Pressable
              key={name}
              style={({ pressed }) => [styles.quickChip, added && styles.quickChipAdded, pressed && styles.pressed]}
              onPress={() => onQuickAdd(name)}
              disabled={added}
              accessibilityRole="button"
              accessibilityState={{ disabled: added }}
              accessibilityLabel={added ? `${name} 추가됨` : `${name} 추가`}>
              <Text style={[styles.quickChipText, added && styles.quickChipTextAdded]}>
                {added ? '✓' : '+'} {name}
              </Text>
            </Pressable>
          );
        })}
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
  searchField: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.textSoft,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIcons: {
    flexDirection: 'row',
  },
  summaryIcon: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  summaryIconOverlap: {
    marginLeft: -10,
  },
  summaryRest: {
    width: 40,
    height: 40,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRestText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  summaryReady: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F7A47',
  },
  summarySub: {
    fontSize: 12,
    color: colors.textSoft,
  },
  matchItem: {
    width: 140,
    gap: 4,
  },
  badge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeReady: {
    color: '#1F7A47',
  },
  badgeMissing: {
    color: '#B8461A',
  },
  matchTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  matchMeta: {
    fontSize: 12,
    color: colors.textSoft,
  },
  dietChips: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dietChip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dietChipText: {
    fontSize: 13,
    color: colors.text,
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
  quickChipAdded: {
    backgroundColor: colors.successSoft,
  },
  quickChipTextAdded: {
    color: '#1F7A47',
    fontWeight: '700',
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
