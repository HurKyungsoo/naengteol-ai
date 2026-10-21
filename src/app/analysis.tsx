import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { analyzeFridgePhoto } from '@/lib/analyze';
import { BOUGHT_PRESETS, isPerishable } from '@/lib/expiry';
import { FREQUENT_INGREDIENTS } from '@/lib/ingredientInput';
import { hasIngredient, normalizeIngredient } from '@/lib/ingredients';
import { getCapturedPhotos, setMissingIds } from '@/lib/photoSession';
import { mergeScans, missingFromScan, type MergedIngredient } from '@/lib/scan';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import type { Bought } from '@/types';

type Status = 'loading' | 'done' | 'error';

// 냉장고 사진 속 재료는 언제 샀는지 알 수 없어서 한 번만 묻는다. 기본은 "모름".
const BOUGHT_OPTIONS: { label: string; value: Bought }[] = [
  ...BOUGHT_PRESETS.map((p) => ({ label: p.label, value: { daysAgo: p.daysAgo } })),
  { label: '잘 모르겠어요', value: 'unknown' },
];

/** 사진을 여러 장 찍었을 때만 안 보인 재료를 "다 썼어요?"로 묻는다. 한 장은 냉장고 일부만 보여서. */
const CHECK_MIN_PHOTOS = 2;

export default function AnalysisScreen() {
  const [photos] = useState(getCapturedPhotos);
  const { pantry, addIngredient } = useAppState();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  // 분석에 실패한 사진 수. 일부만 실패하면 나머지 결과는 보여 준다.
  const [failed, setFailed] = useState(0);
  const [items, setItems] = useState<MergedIngredient[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
  const [bought, setBought] = useState<Bought>('unknown');

  const owned = new Set(pantry.map((p) => normalizeIngredient(p.name)));
  // 기한을 챙길 재료가 있을 때만 "언제 샀어요?"를 묻는다. 이미 냉장고에 있는 재료는 새로 들어가지 않는다.
  const perishable = [...checked].filter((name) => isPerishable(name) && !hasIngredient(owned, name));

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (photos.length === 0) return;
    let cancelled = false;
    // 사진마다 따로 분석하고 이름으로 합친다.
    Promise.allSettled(photos.map((p) => analyzeFridgePhoto(p.base64, p.mimeType))).then((settled) => {
      if (cancelled) return;
      const ok = settled.flatMap((s, i) => (s.status === 'fulfilled' ? [{ label: photos[i].label, result: s.value }] : []));
      if (ok.length === 0) {
        const reason = settled.find((s) => s.status === 'rejected')?.reason;
        setError(reason instanceof Error ? reason.message : '분석에 실패했어요');
        setStatus('error');
        return;
      }
      const merged = mergeScans(ok.map(({ label, result }) => ({ label, items: result.items })));
      setItems(merged);
      setDemo(ok.some(({ result }) => result.demo));
      setFailed(settled.length - ok.length);
      // 확신도가 낮은 재료는 처음에 체크하지 않는다. 사용자가 직접 확인하도록.
      setChecked(new Set(merged.filter((i) => i.confidence >= 0.7).map((i) => i.name)));
      setStatus('done');
    });
    return () => {
      cancelled = true;
    };
  }, [photos, attempt]);

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

  const addItem = (name: string) => {
    if (!items.some((i) => i.name === name)) setItems((prev) => [...prev, { name, confidence: 1, places: [], seen: 0 }]);
    setChecked((prev) => new Set(prev).add(name));
  };

  const addExtra = () => {
    const name = extra.trim();
    if (!name) return;
    addItem(name);
    setExtra('');
  };

  // 사진에 없었지만 흔히 있는 재료. 빠진 걸 한 번에 넣을 수 있게 한다.
  const quick = FREQUENT_INGREDIENTS.filter(
    (n) => !hasIngredient(owned, n) && !items.some((i) => normalizeIngredient(i.name) === normalizeIngredient(n)),
  ).slice(0, 6);

  const confirm = () => {
    // 체크하지 않은 재료도 사진에 보였던 것이므로 "안 보인 재료"에서는 뺀다.
    const missing = photos.length >= CHECK_MIN_PHOTOS ? missingFromScan(pantry, items.map((i) => i.name)) : [];
    checked.forEach((name) => addIngredient(name, undefined, bought));
    setMissingIds(missing.map((p) => p.id));
    router.replace(missing.length > 0 ? '/scan-check' : '/preferences');
  };

  if (photos.length === 0) {
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
        {photos.length === 1 ? (
          <Image source={{ uri: photos[0].uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {photos.map((p, i) => (
              <View key={i}>
                <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
                {p.label && <Text style={styles.thumbLabel}>{p.label}</Text>}
              </View>
            ))}
          </ScrollView>
        )}

        {status === 'loading' && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.loadingText}>
              {photos.length > 1 ? `사진 ${photos.length}장에서 재료를 찾고 있어요…` : '사진에서 재료를 찾고 있어요…'}
            </Text>
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
            {failed > 0 && (
              <Text style={styles.failed}>사진 {failed}장은 분석하지 못했어요. 나머지 사진의 결과예요.</Text>
            )}

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
                    <View style={styles.rowText}>
                      <View style={styles.rowTitle}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        {isOwned && <Text style={styles.ownedBadge}>보유 중</Text>}
                      </View>
                      {item.places.length > 0 && <Text style={styles.places}>{item.places.join(' · ')}</Text>}
                    </View>
                    <View style={styles.spacer} />
                    {item.seen > 0 && <Text style={styles.confidence}>{Math.round(item.confidence * 100)}%</Text>}
                    <Ionicons
                      name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isChecked ? colors.success : colors.border}
                    />
                  </Pressable>
                );
              })}
            </View>

            {quick.length > 0 && (
              <>
                <Text style={styles.quickTitle}>빠진 게 있나요?</Text>
                <View style={styles.quickChips}>
                  {quick.map((name) => (
                    <Pressable
                      key={name}
                      style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
                      onPress={() => addItem(name)}
                      accessibilityRole="button"
                      accessibilityLabel={`${name} 추가`}>
                      <IngredientIcon name={name} size={16} />
                      <Text style={styles.quickChipText}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

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
                  <Text style={styles.boughtHint}>나중에 냉장고 탭에서 한꺼번에 정할 수 있어요.</Text>
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
  rowText: {
    flexShrink: 1,
    gap: 2,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: {
    fontSize: 15,
    color: colors.text,
  },
  places: {
    fontSize: 11,
    color: colors.textMuted,
  },
  strip: {
    gap: spacing.sm,
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumbLabel: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  failed: {
    fontSize: 12,
    color: '#B8461A',
  },
  quickTitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  quickChips: {
    marginTop: -spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickChipText: {
    fontSize: 13,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
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
