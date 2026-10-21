import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { analyzeFridgePhoto, type DetectedIngredient } from '@/lib/analyze';
import { isPerishable } from '@/lib/expiry';
import { hasIngredient, normalizeIngredient } from '@/lib/ingredients';
import { getCapturedPhoto } from '@/lib/photoSession';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import type { Bought } from '@/types';

type Status = 'loading' | 'done' | 'error';

// 냉장고 사진 속 재료는 언제 샀는지 알 수 없어서 한 번만 묻는다. 기본은 "모름".
const BOUGHT_OPTIONS: { label: string; value: Bought }[] = [
  { label: '오늘 샀어요', value: { daysAgo: 0 } },
  { label: '2~3일 전', value: { daysAgo: 3 } },
  { label: '일주일쯤 전', value: { daysAgo: 7 } },
  { label: '잘 모르겠어요', value: 'unknown' },
];

export default function AnalysisScreen() {
  const photo = getCapturedPhoto();
  const { pantry, addIngredient } = useAppState();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [items, setItems] = useState<DetectedIngredient[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
  const [bought, setBought] = useState<Bought>('unknown');

  const owned = new Set(pantry.map((p) => normalizeIngredient(p.name)));
  // 기한을 챙길 재료가 있을 때만 "언제 샀어요?"를 묻는다. 이미 냉장고에 있는 재료는 새로 들어가지 않는다.
  const perishable = [...checked].filter((name) => isPerishable(name) && !hasIngredient(owned, name));

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    analyzeFridgePhoto(photo.base64, photo.mimeType).then(
      (result) => {
        if (cancelled) return;
        setItems(result.items);
        setDemo(result.demo);
        // 확신도가 낮은 재료는 처음에 체크하지 않는다. 사용자가 직접 확인하도록.
        setChecked(new Set(result.items.filter((i) => i.confidence >= 0.7).map((i) => i.name)));
        setStatus('done');
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '분석에 실패했어요');
        setStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [photo, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  };

  const toggle = (name: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const addExtra = () => {
    const name = extra.trim();
    if (!name) return;
    if (!items.some((i) => i.name === name)) setItems((prev) => [...prev, { name, confidence: 1 }]);
    setChecked((prev) => new Set(prev).add(name));
    setExtra('');
  };

  const confirm = () => {
    checked.forEach((name) => addIngredient(name, undefined, bought));
    router.replace('/preferences');
  };

  if (!photo) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="AI 분석 결과" />
        <Text style={styles.center}>분석할 사진이 없어요. 다시 촬영해 주세요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="AI 분석 결과" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />

        {status === 'loading' && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.loadingText}>사진에서 재료를 찾고 있어요…</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.loading}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retry} style={styles.retry}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        {status === 'done' && (
          <>
            {demo && (
              <View style={styles.demo}>
                <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                <Text style={styles.demoText}>
                  데모 결과예요. 사진 분석 서버를 연결하면 실제 사진 속 재료를 인식해요.
                </Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>
              {items.length > 0 ? '다음과 같은 재료를 인식했어요' : '재료를 찾지 못했어요'}
            </Text>
            <Text style={styles.caption}>맞는 재료만 체크해 주세요.</Text>

            <View style={styles.list}>
              {items.map((item) => {
                const isChecked = checked.has(item.name);
                const isOwned = hasIngredient(owned, item.name);
                return (
                  <Pressable
                    key={item.name}
                    style={styles.row}
                    onPress={() => toggle(item.name)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}>
                    <IngredientIcon name={item.name} size={40} tile />
                    <Text style={styles.rowName}>{item.name}</Text>
                    {isOwned && <Text style={styles.ownedBadge}>보유 중</Text>}
                    <View style={styles.spacer} />
                    <Text style={styles.confidence}>{Math.round(item.confidence * 100)}%</Text>
                    <Ionicons
                      name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isChecked ? colors.success : colors.border}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.extra}>
              <TextInput
                value={extra}
                onChangeText={setExtra}
                placeholder="빠진 재료 직접 추가"
                placeholderTextColor={colors.textMuted}
                style={styles.extraInput}
                onSubmitEditing={addExtra}
                returnKeyType="done"
              />
              <Pressable onPress={addExtra} hitSlop={8} accessibilityLabel="재료 추가">
                <Ionicons name="add" size={22} color={colors.text} />
              </Pressable>
            </View>

            {perishable.length > 0 && (
              <View style={styles.bought}>
                <Text style={styles.boughtTitle}>언제 산 재료예요?</Text>
                <Text style={styles.caption2}>
                  {perishable.join(', ')}의 소비기한을 계산하는 데 써요. 냉장고에서 재료마다 바꿀 수 있어요.
                </Text>
                <View style={styles.boughtChips}>
                  {BOUGHT_OPTIONS.map((o) => {
                    const on = JSON.stringify(o.value) === JSON.stringify(bought);
                    return (
                      <Pressable
                        key={o.label}
                        style={[styles.boughtChip, on && styles.boughtChipOn]}
                        onPress={() => setBought(o.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}>
                        <Text style={[styles.boughtChipText, on && styles.boughtChipTextOn]}>{o.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {bought === 'unknown' && (
                  <Text style={styles.boughtHint}>모르면 보관 기간을 짧게 잡아 미리 알려 드려요.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomBar>
        <PrimaryButton
          label={checked.size > 0 ? `${checked.size}개 추가하고 계속하기` : '확인하고 계속하기'}
          onPress={confirm}
          disabled={status !== 'done'}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSoft,
  },
  errorText: {
    fontSize: 14,
    color: colors.heart,
  },
  retry: {
    paddingHorizontal: spacing.lg,
    height: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  retryText: {
    fontWeight: '700',
    color: colors.text,
  },
  demo: {
    flexDirection: 'row',
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  demoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.accent,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  caption: {
    marginTop: -spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: {
    fontSize: 15,
    color: colors.text,
  },
  ownedBadge: {
    fontSize: 11,
    color: colors.textSoft,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  spacer: {
    flex: 1,
  },
  confidence: {
    fontSize: 12,
    color: colors.textMuted,
  },
  extra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  bought: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  boughtTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  caption2: {
    marginTop: -4,
    fontSize: 12,
    color: colors.textMuted,
  },
  boughtChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  boughtChip: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  boughtChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  boughtChipText: {
    fontSize: 13,
    color: colors.text,
  },
  boughtChipTextOn: {
    color: colors.onInk,
    fontWeight: '700',
  },
  boughtHint: {
    fontSize: 12,
    color: colors.textSoft,
  },
  extraInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.text,
  },
});
