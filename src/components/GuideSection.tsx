import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RecipeGuide } from '@/lib/guide';
import { colors, radius, spacing } from '@/theme';

type Props = {
  guide: RecipeGuide | null;
  loading: boolean;
  error: string | null;
  onRequest: () => void;
};

/** 레시피 상세의 "시작 전 준비" (AI 보충 설명) */
export function GuideSection({ guide, loading, error, onRequest }: Props) {
  if (!guide) {
    return (
      <Pressable
        style={({ pressed }) => [styles.request, pressed && styles.pressed]}
        onPress={onRequest}
        disabled={loading}
        accessibilityRole="button">
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Ionicons name="sparkles-outline" size={20} color={colors.ink} />
        )}
        <View style={styles.requestBody}>
          <Text style={styles.requestTitle}>{loading ? '설명을 만들고 있어요…' : 'AI로 자세히 설명 받기'}</Text>
          <Text style={styles.requestDesc}>
            {error ?? (loading ? '처음 한 번만 몇 초 걸려요.' : '손질 순서, 불 세기, 다 됐는지 확인하는 법을 알려 드려요.')}
          </Text>
        </View>
        {!loading && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.ink} />
        <Text style={styles.title}>시작 전 준비</Text>
        <Text style={styles.badge}>AI 보충 설명</Text>
      </View>
      <Text style={styles.overview}>{guide.overview}</Text>
      {guide.prep.map((p) => (
        <Bullet key={p} text={p} />
      ))}
      {guide.cautions.length > 0 && (
        <View style={styles.cautions}>
          {guide.cautions.map((c) => (
            <View key={c} style={styles.cautionRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.accent} />
              <Text style={styles.cautionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.note}>
        원본 레시피를 쉽게 풀어 쓴 설명이에요. 조리 단계별 팁은 ‘레시피 시작하기’에서 볼 수 있어요.
      </Text>
    </View>
  );
}

export function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  request: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  requestBody: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  requestDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    fontSize: 11,
    color: colors.textSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  overview: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  bullet: {
    flexDirection: 'row',
    gap: 6,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSoft,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
  },
  cautions: {
    gap: 4,
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  cautionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cautionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.accent,
  },
  note: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textMuted,
  },
});
