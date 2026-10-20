import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Sticker } from '@/components/Sticker';
import { colors } from '@/theme';

const MIN_VISIBLE_MS = 1400;

const STICKERS = [
  { icon: 'cucumber', left: 14, top: 18, size: 72, rotate: -12 },
  { icon: 'tomato', left: 112, top: 0, size: 78, rotate: 8 },
  { icon: 'cheese', left: 0, top: 104, size: 74, rotate: 6 },
  { icon: 'olive', left: 100, top: 96, size: 70, rotate: -8 },
] as const;

/** 시작 화면. 저장된 데이터를 불러오는 동안 보여주고 사라진다. */
export function Intro({ ready }: { ready: boolean }) {
  const [shownAt] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setVisible(false),
      );
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, shownAt, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.cluster}>
        {STICKERS.map((s) => (
          <View key={s.icon} style={{ position: 'absolute', left: s.left, top: s.top }}>
            <Sticker icon={s.icon} size={s.size} rotate={s.rotate} />
          </View>
        ))}
      </View>
      <Text style={styles.logo}>냉털AI</Text>
      <Text style={styles.tagline}>냉장고 속 재료로{'\n'}오늘의 한 끼</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cluster: {
    width: 190,
    height: 180,
    marginBottom: 48,
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
  },
  tagline: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
