import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentTabs } from '@/components/Tabs';
import { KNOWN_INGREDIENTS } from '@/lib/icons';
import { normalizeIngredient } from '@/lib/ingredients';
import { pickPhotoFromLibrary } from '@/lib/pickPhoto';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';

type Mode = 'manual' | 'photo' | 'recent';

const FREQUENT = ['계란', '밥', '김치', '두부', '양파', '대파', '감자', '토마토', '돼지고기', '닭가슴살', '참치캔', '양배추'];

export default function AddIngredientsScreen() {
  const { pantry, cookLogs, addIngredient, removeIngredient, clearPantry } = useAppState();
  const [mode, setMode] = useState<Mode>('manual');
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const owned = useMemo(() => new Set(pantry.map((p) => normalizeIngredient(p.name))), [pantry]);

  // "계란, 두부, 양" 처럼 여러 개를 입력하는 중이면 마지막 단어로 자동완성한다.
  const tokens = text.split(/[,\s]+/);
  const query = normalizeIngredient(tokens[tokens.length - 1] ?? '');
  const suggestions = query
    ? KNOWN_INGREDIENTS.filter((n) => n.includes(query) && !owned.has(normalizeIngredient(n))).slice(0, 6)
    : [];

  // 요리하면서 다 쓴 재료 중 지금 냉장고에 없는 것
  const recentlyUsed = [...new Set(cookLogs.flatMap((l) => l.usedIngredients))].filter(
    (n) => !owned.has(normalizeIngredient(n)),
  );

  /** 쉼표나 띄어쓰기로 구분한 재료를 한 번에 추가한다. */
  const addAll = (input: string) => {
    const names = input.split(/[,\s]+/).filter(Boolean);
    if (names.length === 0) return;
    const duplicates = names.filter((n) => !addIngredient(n));
    setMessage(duplicates.length > 0 ? `${duplicates.join(', ')}은(는) 이미 있어요` : null);
    setText('');
  };

  const addSuggestion = (name: string) => {
    addIngredient(name);
    setMessage(null);
    // 입력 중이던 마지막 단어만 자동완성으로 바꾸고, 앞서 쓴 재료는 남겨 둔다.
    setText(tokens.slice(0, -1).filter(Boolean).join(', ') + (tokens.length > 1 ? ', ' : ''));
  };

  const add = (name: string) => {
    setMessage(addIngredient(name) ? null : `'${name}'은(는) 이미 있어요`);
  };

  const fromLibrary = async () => {
    if (await pickPhotoFromLibrary()) router.push('/analysis');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="재료 등록" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentTabs
          options={[
            { value: 'manual', label: '직접 입력' },
            { value: 'photo', label: '사진으로 등록' },
            { value: 'recent', label: '최근 사용' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'manual' && (
          <View style={styles.block}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={text}
                onChangeText={(t) => {
                  setText(t);
                  setMessage(null);
                }}
                placeholder="재료명 입력 (여러 개는 쉼표로 구분)"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="done"
                onSubmitEditing={() => addAll(text)}
              />
              <Pressable onPress={() => addAll(text)} hitSlop={8} accessibilityLabel="재료 추가">
                <Ionicons name="add" size={24} color={colors.text} />
              </Pressable>
            </View>
            {suggestions.length > 0 && (
              <View style={styles.chips}>
                {suggestions.map((s) => (
                  <Pressable key={s} style={styles.suggestion} onPress={() => addSuggestion(s)}>
                    <IngredientIcon name={s} size={18} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
        )}

        {mode === 'photo' && (
          <View style={styles.photoOptions}>
            <Pressable style={styles.photoCard} onPress={() => router.push('/camera')}>
              <Ionicons name="camera-outline" size={28} color={colors.text} />
              <Text style={styles.photoTitle}>냉장고 촬영하기</Text>
              <Text style={styles.photoDesc}>AI가 사진 속 재료를 찾아줘요</Text>
            </Pressable>
            <Pressable style={styles.photoCard} onPress={fromLibrary}>
              <Ionicons name="images-outline" size={28} color={colors.text} />
              <Text style={styles.photoTitle}>앨범에서 선택</Text>
              <Text style={styles.photoDesc}>찍어 둔 사진으로도 돼요</Text>
            </Pressable>
          </View>
        )}

        {mode === 'recent' && (
          <View style={styles.block}>
            <Text style={styles.caption}>{recentlyUsed.length > 0 ? '요리하며 다 쓴 재료' : '자주 쓰는 재료'}</Text>
            <View style={styles.chips}>
              {(recentlyUsed.length > 0 ? recentlyUsed : FREQUENT.filter((f) => !owned.has(normalizeIngredient(f)))).map(
                (n) => (
                  <Pressable key={n} style={styles.suggestion} onPress={() => add(n)}>
                    <IngredientIcon name={n} size={18} />
                    <Text style={styles.suggestionText}>{n}</Text>
                    <Ionicons name="add" size={14} color={colors.textSoft} />
                  </Pressable>
                ),
              )}
            </View>
          </View>
        )}

        <View style={styles.ownedHeader}>
          <Text style={styles.sectionTitle}>보유 재료 {pantry.length}</Text>
          {pantry.length > 0 && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (confirmClear) {
                  clearPantry();
                  setConfirmClear(false);
                } else setConfirmClear(true);
              }}>
              <Text style={[styles.clear, confirmClear && styles.clearConfirm]}>
                {confirmClear ? '한 번 더 누르면 삭제' : '전체 삭제'}
              </Text>
            </Pressable>
          )}
        </View>
        {pantry.length === 0 ? (
          <Text style={styles.empty}>아직 등록한 재료가 없어요.</Text>
        ) : (
          <View style={styles.ownedGrid}>
            {pantry.map((p) => (
              <View key={p.id} style={styles.ownedItem}>
                <IngredientIcon name={p.name} size={32} tile />
                <View style={styles.ownedText}>
                  <Text style={styles.ownedName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.amount && <Text style={styles.ownedAmount}>{p.amount}</Text>}
                </View>
                <Pressable onPress={() => removeIngredient(p.id)} hitSlop={8} accessibilityLabel={`${p.name} 삭제`}>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomBar>
        <PrimaryButton
          label={pantry.length > 0 ? '저장하고 추천받기' : '저장하기'}
          onPress={() => (pantry.length > 0 ? router.push('/preferences') : router.back())}
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  block: {
    gap: spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  message: {
    fontSize: 13,
    color: colors.accent,
  },
  caption: {
    fontSize: 13,
    color: colors.textMuted,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  photoTitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  photoDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ownedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  clear: {
    fontSize: 13,
    color: colors.textMuted,
  },
  clearConfirm: {
    color: colors.heart,
    fontWeight: '700',
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
  },
  ownedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ownedItem: {
    width: '31.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  ownedText: {
    flex: 1,
    minWidth: 0,
  },
  ownedName: {
    fontSize: 13,
    color: colors.text,
  },
  ownedAmount: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
