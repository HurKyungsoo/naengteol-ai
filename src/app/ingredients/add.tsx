import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { SegmentTabs } from '@/components/Tabs';
import { buildVocabulary, checkIngredient, splitIngredientInput } from '@/lib/ingredientInput';
import { normalizeIngredient } from '@/lib/ingredients';
import { pickPhotoFromLibrary } from '@/lib/pickPhoto';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';

type Mode = 'manual' | 'photo';

const FREQUENT = ['계란', '밥', '김치', '두부', '양파', '대파', '감자', '토마토', '돼지고기', '닭가슴살', '참치캔', '양배추'];

export default function AddIngredientsScreen() {
  const params = useLocalSearchParams<{ focus?: string; tab?: string }>();
  const { pantry, cookLogs, addIngredient, removeIngredient } = useAppState();
  const { recipes } = useRecipes();
  const vocabulary = useMemo(() => buildVocabulary(recipes), [recipes]);
  const [mode, setMode] = useState<Mode>(params.tab === 'photo' ? 'photo' : 'manual');
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  // 모르는 재료라 넣지 않은 이름. 비슷한 재료를 고르거나 그래도 넣을 수 있다.
  const [unknown, setUnknown] = useState<{ name: string; suggestions: string[]; invalid: boolean }[]>([]);
  // 이 화면에서 넣은 재료. 냉장고 전체는 냉장고 탭에서 본다.
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const owned = useMemo(() => new Set(pantry.map((p) => normalizeIngredient(p.name))), [pantry]);
  const isOwned = (n: string) => owned.has(normalizeIngredient(n));

  // "계란, 두부, 양" 처럼 여러 개를 입력하는 중이면 마지막 단어로 비슷한 재료를 찾는다.
  const tokens = text.split(/[,，]/);
  const query = normalizeIngredient(tokens[tokens.length - 1]?.trim() ?? '');
  // 아는 재료는 1,500개 정도라 매번 걸러도 충분히 빠르다.
  const suggestions = query
    ? [...vocabulary]
        .filter((n) => n.includes(query) && !owned.has(n))
        .sort((a, b) => Number(!a.startsWith(query)) - Number(!b.startsWith(query)) || a.length - b.length)
        .slice(0, 8)
    : [];

  // 요리하며 다 쓴 재료 중 지금 냉장고에 없는 것
  const usedUp = [...new Set(cookLogs.flatMap((l) => l.usedIngredients))].filter((n) => !isOwned(n));
  // 다시 넣기 칩에 이미 있는 재료는 자주 쓰는 재료에서 뺀다.
  const frequent = FREQUENT.filter((n) => !isOwned(n) && !usedUp.includes(n));

  const put = (name: string): boolean => {
    const ok = addIngredient(name);
    if (ok) setJustAdded((list) => [...list, name]);
    return ok;
  };

  /** 쉼표로 구분한 재료를 한 번에 넣는다. 모르는 이름은 넣지 않고 비슷한 재료를 제안한다. */
  const addAll = (input: string) => {
    const names = splitIngredientInput(input);
    if (names.length === 0) return;
    const checks = names.map((name) => ({ name, check: checkIngredient(name, vocabulary) }));
    setUnknown(
      checks.flatMap(({ name, check }) =>
        check.known ? [] : [{ name, suggestions: check.suggestions, invalid: check.invalid }],
      ),
    );
    const duplicates = checks.filter((c) => c.check.known && !put(c.name)).map((c) => c.name);
    setMessage(duplicates.length > 0 ? `${duplicates.join(', ')}은(는) 이미 냉장고에 있어요` : null);
    setText('');
  };

  const pickSuggestion = (name: string) => {
    setMessage(put(name) ? null : `'${name}'은(는) 이미 냉장고에 있어요`);
    // 입력 중이던 마지막 단어만 바꾸고, 앞서 쓴 재료는 남겨 둔다.
    const before = tokens.slice(0, -1).map((s) => s.trim()).filter(Boolean);
    setText(before.join(', ') + (before.length > 0 ? ', ' : ''));
  };

  const resolveUnknown = (name: string, pick?: string) => {
    if (pick) setMessage(put(pick) ? null : `'${pick}'은(는) 이미 냉장고에 있어요`);
    setUnknown((list) => list.filter((u) => u.name !== name));
  };

  const takeBack = (name: string) => {
    const item = pantry.find((p) => normalizeIngredient(p.name) === normalizeIngredient(name));
    if (item) removeIngredient(item.id);
    setJustAdded((list) => list.filter((n) => n !== name));
  };

  const fromLibrary = async () => {
    if (await pickPhotoFromLibrary()) router.push('/analysis');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="재료 넣기" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentTabs
          options={[
            { value: 'manual', label: '직접 입력' },
            { value: 'photo', label: '사진으로' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'manual' && (
          <View style={styles.block}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textSoft} />
              <TextInput
                value={text}
                onChangeText={(t) => {
                  setText(t);
                  setMessage(null);
                }}
                placeholder="재료 이름 (여러 개는 쉼표로)"
                placeholderTextColor={colors.textSoft}
                style={styles.searchInput}
                returnKeyType="done"
                onSubmitEditing={() => addAll(text)}
                submitBehavior="submit"
                autoFocus={params.focus === '1'}
              />
              <Pressable onPress={() => addAll(text)} style={styles.searchButton} accessibilityLabel="넣기">
                <Ionicons name="add" size={20} color={colors.onInk} />
              </Pressable>
            </View>

            {message && <Text style={styles.message}>{message}</Text>}
            {unknown.map((u) => (
              <View key={u.name} style={styles.unknown}>
                <Pressable
                  onPress={() => resolveUnknown(u.name)}
                  hitSlop={8}
                  style={styles.unknownClose}
                  accessibilityRole="button"
                  accessibilityLabel="닫기">
                  <Ionicons name="close" size={16} color={colors.textSoft} />
                </Pressable>
                <Text style={styles.unknownText}>
                  {u.invalid
                    ? `'${u.name}'은(는) 재료 이름으로 보기 어려워요`
                    : u.suggestions.length > 0
                      ? `'${u.name}'은(는) 모르는 재료예요. 혹시 이 중에 있나요?`
                      : `'${u.name}'은(는) 모르는 재료예요`}
                </Text>
                {!u.invalid && (
                  <View style={styles.chips}>
                    {u.suggestions.map((s) => (
                      <Chip key={s} name={s} onPress={() => resolveUnknown(u.name, s)} />
                    ))}
                    <Pressable
                      style={[styles.chip, styles.unknownForce]}
                      onPress={() => resolveUnknown(u.name, u.name)}
                      accessibilityRole="button">
                      <Text style={styles.unknownForceText}>{`그래도 '${u.name}' 넣기`}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {query ? (
              suggestions.length > 0 && (
                <View style={styles.group}>
                  <Text style={styles.caption}>비슷한 재료</Text>
                  <View style={styles.chips}>
                    {suggestions.map((s) => (
                      <Chip key={s} name={s} onPress={() => pickSuggestion(s)} />
                    ))}
                  </View>
                </View>
              )
            ) : (
              <>
                {usedUp.length > 0 && (
                  <View style={styles.group}>
                    <Text style={styles.caption}>요리하며 다 쓴 재료 · 다시 넣기</Text>
                    <View style={styles.chips}>
                      {usedUp.map((n) => (
                        <Chip key={n} name={n} plus onPress={() => put(n)} />
                      ))}
                    </View>
                  </View>
                )}
                {frequent.length > 0 && (
                  <View style={styles.group}>
                    <Text style={styles.caption}>자주 쓰는 재료</Text>
                    <View style={styles.chips}>
                      {frequent.map((n) => (
                        <Chip key={n} name={n} plus onPress={() => put(n)} />
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {mode === 'photo' && (
          <View style={styles.photoOptions}>
            <Pressable style={styles.photoCard} onPress={() => router.push('/camera')}>
              <Ionicons name="camera-outline" size={28} color={colors.text} />
              <Text style={styles.photoTitle}>냉장고 찍기</Text>
              <Text style={styles.photoDesc}>AI가 사진 속 재료를 찾아요</Text>
            </Pressable>
            <Pressable style={styles.photoCard} onPress={fromLibrary}>
              <Ionicons name="images-outline" size={28} color={colors.text} />
              <Text style={styles.photoTitle}>앨범에서 고르기</Text>
              <Text style={styles.photoDesc}>찍어 둔 사진도 돼요</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.justHeader}>
          <Text style={styles.sectionTitle}>방금 넣은 재료 {justAdded.length}</Text>
          <Text style={styles.caption}>냉장고 전체 {pantry.length}개</Text>
        </View>
        {justAdded.length === 0 ? (
          <Text style={styles.caption}>위에서 재료를 고르거나 입력해 보세요.</Text>
        ) : (
          <View style={styles.chips}>
            {justAdded.map((n) => (
              <View key={n} style={styles.justChip}>
                <IngredientIcon name={n} size={22} />
                <Text style={styles.chipText}>{n}</Text>
                <Pressable onPress={() => takeBack(n)} hitSlop={8} accessibilityLabel={`${n} 빼기`}>
                  <Ionicons name="close" size={15} color={colors.textSoft} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomBar>
        <PrimaryButton
          label={justAdded.length > 0 ? `완료 · ${justAdded.length}개 넣었어요` : '완료'}
          onPress={goBack}
        />
      </BottomBar>
    </View>
  );
}

function Chip({ name, plus = false, onPress }: { name: string; plus?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} 넣기`}>
      <IngredientIcon name={name} size={22} />
      <Text style={styles.chipText}>{name}</Text>
      {plus && <Ionicons name="add" size={14} color={colors.textSoft} />}
    </Pressable>
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
    gap: spacing.lg,
  },
  block: {
    gap: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
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
  message: {
    fontSize: 13,
    color: '#B8461A',
  },
  group: {
    gap: spacing.sm,
  },
  caption: {
    fontSize: 12,
    color: colors.textSoft,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    height: 38,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  unknown: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    gap: spacing.sm,
  },
  unknownText: {
    paddingRight: 24,
    fontSize: 13,
    fontWeight: '600',
    color: '#8A3412',
  },
  unknownClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  unknownForce: {
    paddingLeft: spacing.md,
    backgroundColor: 'transparent',
    borderColor: '#E3B9A3',
  },
  unknownForceText: {
    fontSize: 12,
    color: '#8A3412',
  },
  photoOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoCard: {
    flex: 1,
    gap: 6,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  photoTitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  photoDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
  justHeader: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  justChip: {
    height: 38,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
