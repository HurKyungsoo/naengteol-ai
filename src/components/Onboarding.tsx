import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Appear } from '@/components/Appear';
import { IngredientIcon } from '@/components/IngredientIcon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { Sticker } from '@/components/Sticker';
import { EXPIRY_COLORS, expiryLevel, expiryPhrase } from '@/lib/expiry';
import { colors, radius, shadow, spacing } from '@/theme';

const PAGE_COUNT = 4;

/** 처음 켰을 때 한 번만 보여 주는 소개 4장. 마지막 장의 [시작하기]로 홈에 들어간다. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // 가로 스크롤 안에서는 flex로 높이가 채워지지 않아서 직접 잰다.
  const [pageHeight, setPageHeight] = useState(0);
  const last = page === PAGE_COUNT - 1;

  const goTo = (p: number) => scroll.current?.scrollTo({ x: p * width, animated: true });

  // 반쯤 넘겼을 때 다음 장으로 보고 등장 애니메이션을 시작한다.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.min(PAGE_COUNT - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (p !== page) setPage(p);
  };

  // 안드로이드 뒤로 가기는 앞 장으로. 첫 장에서는 아무것도 하지 않는다 (뒤에 홈이 깔려 있어서).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page > 0) scroll.current?.scrollTo({ x: (page - 1) * width, animated: true });
      return true;
    });
    return () => sub.remove();
  }, [page, width]);

  return (
    <View style={styles.overlay}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.logo}>냉털AI</Text>
        {!last && (
          <Pressable onPress={() => goTo(PAGE_COUNT - 1)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.skip}>건너뛰기</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
        style={styles.pager}>
        <Page
          width={width}
          height={pageHeight}
          visual={<WelcomeVisual play={page === 0} />}
          title={
            <Text style={[styles.title, styles.titleLarge]}>
              냉장고 털어서{'\n'}오늘의 <Text style={styles.titleAccent}>한 끼</Text>
            </Text>
          }
          body={'있는 재료만 알려 주면 만들 요리부터\n따라 하는 법까지 챙겨 드려요.'}
          play={page === 0}
          textDelay={600}
        />
        <Page
          width={width}
          height={pageHeight}
          visual={<RecipeVisual play={page === 1} />}
          title={<Text style={styles.title}>있는 재료로{'\n'}바로 만들 수 있는 요리</Text>}
          body={'핵심 재료를 얼마나 가졌는지 보고 추천해요.\n없는 재료는 대체 재료까지 알려 드려요.'}
          play={page === 1}
        />
        <Page
          width={width}
          height={pageHeight}
          visual={<VideoVisual play={page === 2} />}
          title={<Text style={styles.title}>영상 보면서{'\n'}그대로 따라 만들어요</Text>}
          body={'레시피마다 참고 영상을 찾아 뒀어요. 앱 안에서\n바로 재생되고, 단계마다 타이머도 켤 수 있어요.'}
          play={page === 2}
        />
        <Page
          width={width}
          height={pageHeight}
          visual={<ExpiryVisual play={page === 3} />}
          title={<Text style={styles.title}>곧 상하는 재료부터{'\n'}먼저 챙겨 드려요</Text>}
          body={'재료를 담으면 소비기한을 알아서 계산하고,\n그 재료로 만들 요리를 먼저 추천해요.'}
          play={page === 3}
          textDelay={380}
        />
      </ScrollView>

      {/* 모든 장에서 같은 자리의 버튼: 앞 장은 [다음], 마지막 장은 [시작하기] */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Dots page={page} />
        <View style={styles.nextButton}>
          <PrimaryButton label={last ? '시작하기' : '다음'} onPress={last ? onDone : () => goTo(page + 1)} />
        </View>
      </View>
    </View>
  );
}

function Page({
  width,
  height,
  visual,
  title,
  body,
  play,
  textDelay = 200,
}: {
  width: number;
  height: number;
  visual: ReactNode;
  title: ReactNode;
  body: string;
  play: boolean;
  textDelay?: number;
}) {
  return (
    <View style={[styles.page, { width, height }]}>
      <Stage>{visual}</Stage>
      <Appear play={play} delay={textDelay} style={styles.text}>
        {title}
        <Text style={styles.body}>{body}</Text>
      </Appear>
    </View>
  );
}

const STAGE_W = 310;
const STAGE_H = 330;

/** 그림은 310×330 기준으로 그리고, 작은 화면에서는 남은 공간에 맞게 줄인다. */
function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  return (
    <View
      style={styles.stage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setScale(Math.min(1, width / STAGE_W, height / STAGE_H));
      }}>
      <View style={{ width: STAGE_W, height: STAGE_H, transform: [{ scale }] }}>{children}</View>
    </View>
  );
}

function Dots({ page }: { page: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`${PAGE_COUNT}장 중 ${page + 1}장`}>
      {Array.from({ length: PAGE_COUNT }, (_, i) => (
        <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
      ))}
    </View>
  );
}

// ── 장마다의 그림 ─────────────────────────────────────────

const WELCOME_STICKERS = [
  { icon: 'cucumber', left: 22, top: 46, size: 100, rotate: -12 },
  { icon: 'tomato', left: 172, top: 16, size: 110, rotate: 8 },
  { icon: 'cheese', left: 4, top: 186, size: 104, rotate: 6 },
  { icon: 'olive', left: 186, top: 188, size: 98, rotate: -8 },
  { icon: 'egg', left: 112, top: 122, size: 86, rotate: 3 },
] as const;

function WelcomeVisual({ play }: { play: boolean }) {
  return (
    <>
      {WELCOME_STICKERS.map((s, i) => (
        <Appear
          key={s.icon}
          play={play}
          kind="pop"
          float
          delay={i * 120}
          style={{ position: 'absolute', left: s.left, top: s.top }}>
          <Sticker icon={s.icon} size={s.size} rotate={s.rotate} />
        </Appear>
      ))}
    </>
  );
}

const OWNED_CHIPS = [
  { name: '김치', left: 0, top: 262, rotate: -6 },
  { name: '계란', left: 110, top: 286, rotate: 4 },
  { name: '대파', left: 196, top: 256, rotate: -2 },
];

function RecipeVisual({ play }: { play: boolean }) {
  return (
    <>
      <Appear play={play} style={styles.recipeCardSlot}>
        <View style={styles.recipeCard}>
          <View style={styles.recipeCardClip}>
            <RecipeImage recipe={{ id: 'kimchi-fried-rice', tint: '#FDE3D6' }} width={240} height={170} radius={0} />
            <Text style={[styles.badge, styles.badgeReady]}>바로 가능</Text>
            <View style={styles.recipeCardText}>
              <Text style={styles.recipeTitle}>김치볶음밥</Text>
              <Text style={styles.meta}>20분 · 보통</Text>
            </View>
          </View>
        </View>
      </Appear>
      {OWNED_CHIPS.map((c, i) => (
        <Appear
          key={c.name}
          play={play}
          kind="pop"
          delay={450 + i * 150}
          style={{ position: 'absolute', left: c.left, top: c.top }}>
          <View style={[styles.chip, { transform: [{ rotate: `${c.rotate}deg` }] }]}>
            <IngredientIcon name={c.name} size={28} />
            <Text style={styles.chipText}>{c.name}</Text>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
        </Appear>
      ))}
    </>
  );
}

function VideoVisual({ play }: { play: boolean }) {
  return (
    <>
      <Appear play={play} style={styles.videoCardSlot}>
        <View style={styles.videoCard}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoLabel}>참고 영상</Text>
            <View style={styles.youtube}>
              <Ionicons name="logo-youtube" size={12} color="#FF0033" />
              <Text style={styles.youtubeText}>YouTube</Text>
            </View>
          </View>
          <View style={styles.videoFrame}>
            <RecipeImage
              recipe={{ id: 'tomato-egg-stirfry', tint: '#FDE7DF' }}
              width="100%"
              height={158}
              radius={0}
              style={StyleSheet.absoluteFill}
            />
            <Appear play={play} kind="pop" pulse delay={600}>
              <View style={styles.play}>
                <Ionicons name="play" size={26} color="#fff" style={styles.playIcon} />
              </View>
            </Appear>
          </View>
          <Text style={styles.videoTitle}>토마토 계란볶음 따라 하기</Text>
        </View>
      </Appear>
      <Appear play={play} kind="pop" delay={500} style={styles.timerSlot}>
        <View style={styles.timer}>
          <View style={styles.timerIcon}>
            <Ionicons name="timer-outline" size={17} color={colors.ink} />
          </View>
          <View>
            <Text style={styles.timerStep}>2단계 · 계란 익히기</Text>
            <Text style={styles.timerTime}>02:30</Text>
          </View>
        </View>
      </Appear>
      <Appear play={play} kind="pop" delay={650} style={{ position: 'absolute', left: 6, top: 268 }}>
        <Sticker icon="tomato" size={64} rotate={-10} />
      </Appear>
      <Appear play={play} kind="pop" delay={780} style={{ position: 'absolute', left: 72, top: 284 }}>
        <Sticker icon="egg" size={54} rotate={8} />
      </Appear>
    </>
  );
}

const EXPIRY_SAMPLE = [
  { name: '두부', days: 1, rotate: -2, indent: 0 },
  { name: '우유', days: 3, rotate: 0, indent: 18 },
  { name: '대파', days: 6, rotate: 1.5, indent: 0 },
];

function ExpiryVisual({ play }: { play: boolean }) {
  return (
    <View style={styles.expiryList}>
      {EXPIRY_SAMPLE.map((item, i) => {
        const tone = EXPIRY_COLORS[expiryLevel(item.days)];
        return (
          <Appear key={item.name} play={play} delay={i * 120}>
            <View
              style={[
                styles.expiryRow,
                i === 0 && styles.expiryRowFirst,
                { marginLeft: item.indent, transform: [{ rotate: `${item.rotate}deg` }] },
              ]}>
              <IngredientIcon name={item.name} size={48} tile />
              <View style={styles.expiryText}>
                <Text style={styles.expiryName}>{item.name}</Text>
                <Text style={styles.meta}>{expiryPhrase(item.days)}</Text>
              </View>
              <Appear play={play} kind="pop" pulse={i === 0} delay={i === 0 ? 800 : i * 120}>
                <Text style={[styles.dDay, { color: tone.text, backgroundColor: tone.bg }]}>D-{item.days}</Text>
              </Appear>
            </View>
          </Appear>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  logo: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  skip: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSoft,
  },
  pager: {
    flex: 1,
  },
  page: {
    paddingHorizontal: spacing.xl,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    gap: 14,
    paddingTop: spacing.lg,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
  },
  titleLarge: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  titleAccent: {
    color: colors.accent,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSoft,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  nextButton: {
    width: 150,
    flexDirection: 'row',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotOn: {
    width: 22,
    backgroundColor: colors.ink,
  },
  meta: {
    fontSize: 13,
    color: colors.textSoft,
  },
  // 2장: 추천 요리
  recipeCardSlot: {
    position: 'absolute',
    left: 35,
    top: 20,
  },
  recipeCard: {
    width: 240,
    borderRadius: 24,
    backgroundColor: colors.surface,
    boxShadow: shadow.sticker,
    transform: [{ rotate: '-3deg' }],
  },
  recipeCardClip: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  recipeCardText: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeReady: {
    backgroundColor: colors.successSoft,
    color: '#1F7A47',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadow.sticker,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  // 3장: 영상
  videoCardSlot: {
    position: 'absolute',
    left: 0,
    top: 24,
  },
  videoCard: {
    width: 310,
    padding: 14,
    gap: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadow.sticker,
    transform: [{ rotate: '-2deg' }],
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  youtube: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  youtubeText: {
    fontSize: 11,
    color: colors.textSoft,
  },
  videoFrame: {
    height: 158,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 3,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timerSlot: {
    position: 'absolute',
    left: 150,
    top: 262,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    transform: [{ rotate: '4deg' }],
  },
  timerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStep: {
    fontSize: 11,
    color: '#C9C9C6',
  },
  timerTime: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onInk,
  },
  // 4장: 소비기한
  expiryList: {
    position: 'absolute',
    left: 10,
    top: 40,
    width: 290,
    gap: 10,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: shadow.soft,
  },
  expiryRowFirst: {
    boxShadow: shadow.sticker,
  },
  expiryText: {
    flex: 1,
    gap: 2,
  },
  expiryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dDay: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '800',
  },
});
