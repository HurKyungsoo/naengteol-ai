import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { analyzeFridgePhoto, type DetectedIngredient } from '@/lib/analyze';
import { hasIngredient, normalizeIngredient } from '@/lib/ingredients';
import { getCapturedPhoto } from '@/lib/photoSession';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';

type Status = 'loading' | 'done' | 'error';

export default function AnalysisScreen() {
  const photo = getCapturedPhoto();
  const { pantry, addIngredient } = useAppState();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [items, setItems] = useState<DetectedIngredient[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');

  const owned = new Set(pantry.map((p) => normalizeIngredient(p.name)));

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
    checked.forEach((name) => addIngredient(name));
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
  extraInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.text,
  },
});
