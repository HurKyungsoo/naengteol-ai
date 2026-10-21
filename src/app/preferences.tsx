import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { expiringItems } from '@/lib/expiry';
import { splitIngredientInput } from '@/lib/ingredientInput';
import { normalizeIngredient } from '@/lib/ingredients';
import { countRecipes, pantryCoverage } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing, switchColors } from '@/theme';
import { DIETS, type Difficulty, type Preferences, type ServingsOption } from '@/types';

const TIME_OPTIONS: { value?: number; label: string }[] = [
  { label: '전체' },
  { value: 10, label: '10분' },
  { value: 20, label: '20분' },
  { value: 30, label: '30분' },
];
const DIFFICULTY_OPTIONS: (Difficulty | undefined)[] = [undefined, '쉬움', '보통', '어려움'];
const SERVINGS_OPTIONS: (ServingsOption | undefined)[] = [undefined, '1~2인', '3인 이상'];

/** 받침이 있으면 "을", 없으면 "를" */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '을(를)';
  return code % 28 === 0 ? '를' : '을';
}

/** 조건을 하나만 풀어 볼 후보. 앞에 있을수록 덜 바뀌는 것이라 먼저 제안한다. */
function relaxations(p: Preferences): { phrase: string; patch: Partial<Preferences> }[] {
  const list: { phrase: string; patch: Partial<Preferences> }[] = [];
  if (p.maxMinutes) {
    for (const t of TIME_OPTIONS) {
      if (t.value && t.value > p.maxMinutes) list.push({ phrase: `조리 시간을 ${t.label}으로 바꾸면`, patch: { maxMinutes: t.value } });
    }
    list.push({ phrase: '조리 시간 조건을 빼면', patch: { maxMinutes: undefined } });
  }
  if (p.difficulty) list.push({ phrase: '난이도 조건을 빼면', patch: { difficulty: undefined } });
  if (p.servings) list.push({ phrase: '인분 조건을 빼면', patch: { servings: undefined } });
  if (p.diet) list.push({ phrase: '식단 선택을 빼면', patch: { diet: undefined } });
  if (p.preferOwned) list.push({ phrase: '냉장고 재료 조건을 끄면', patch: { preferOwned: false } });
  return list;
}

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { pantry, preferences, setPreferences, loaded } = useAppState();
  const { recipes } = useRecipes();
  const [draft, setDraft] = useState<Preferences>(preferences);
  // 저장된 값을 불러오기 전에 화면이 먼저 열리면 기본값으로 시작하므로, 불러온 뒤 한 번 맞춘다.
  const [synced, setSynced] = useState(loaded);
  if (!synced && loaded) {
    setSynced(true);
    setDraft(preferences);
  }
  const [adding, setAdding] = useState(false);
  const [excludeText, setExcludeText] = useState('');

  const update = (patch: Partial<Preferences>) => setDraft((d) => ({ ...d, ...patch }));
  // 빼고 싶은 재료는 검색 조건이 아니라 사용자 정보라 초기화해도 남긴다.
  const reset = () => setDraft({ preferOwned: true, soonFirst: true, excluded: draft.excluded });

  // 칩을 누를 때마다 개수를 다시 세므로, 냉장고 재료와 맞춰 보는 무거운 계산은 한 번만 한다.
  const coverage = useMemo(() => pantryCoverage(recipes, pantry), [recipes, pantry]);
  const count = (p: Preferences) => countRecipes(recipes, p, coverage);
  const now = count(draft);
  // 고르면 0개가 되는 칩은 흐리게 보여 준다.
  const dead = (patch: Partial<Preferences>) => count({ ...draft, ...patch }).total === 0;

  const fix =
    now.total === 0
      ? relaxations(draft)
          .map((r) => ({ ...r, total: count({ ...draft, ...r.patch }).total }))
          .find((r) => r.total > 0)
      : undefined;

  const soonNames = expiringItems(pantry).map((p) => p.name);
  const excluded = draft.excluded ?? [];

  const addExcluded = () => {
    const names = splitIngredientInput(excludeText);
    const keys = new Set(excluded.map(normalizeIngredient));
    const fresh = names.filter((n) => !keys.has(normalizeIngredient(n)));
    if (fresh.length > 0) update({ excluded: [...excluded, ...fresh] });
    setExcludeText('');
    setAdding(false);
  };

  const submit = (p: Preferences) => {
    setPreferences(p);
    router.navigate('/recipes');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="추천 조건"
        right={
          <Pressable onPress={reset} hitSlop={10} accessibilityRole="button">
            <Text style={styles.reset}>초기화</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>
          식단 <Text style={styles.sectionSub}>하나만 골라요</Text>
        </Text>
        <View style={styles.diets}>
          {DIETS.map((d) => {
            const active = draft.diet === d.id;
            const dim = !active && dead({ diet: d.id });
            return (
              <Pressable
                key={d.id}
                style={[styles.diet, active && styles.dietActive, dim && styles.dim]}
                onPress={() => update({ diet: active ? undefined : d.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <IngredientIcon icon={d.icon} size={24} />
                <Text style={[styles.dietText, active && styles.dietTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {(draft.diet === '다이어트' || draft.diet === '고단백') && (
          <Text style={styles.hint}>
            다이어트식·고단백은 메뉴를 고르기 위한 분류예요. 의학적 효과나 영양 목표 달성을 보장하지 않아요.
          </Text>
        )}

        <Text style={[styles.section, styles.spaced]}>조건</Text>
        <ChipLine
          label="조리 시간"
          options={TIME_OPTIONS.map((t) => ({
            label: t.label,
            active: t.value === draft.maxMinutes,
            dim: t.value !== draft.maxMinutes && dead({ maxMinutes: t.value }),
            onPress: () => update({ maxMinutes: t.value }),
          }))}
        />
        <ChipLine
          label="난이도"
          options={DIFFICULTY_OPTIONS.map((d) => ({
            label: d ?? '전체',
            active: d === draft.difficulty,
            dim: d !== draft.difficulty && dead({ difficulty: d }),
            onPress: () => update({ difficulty: d }),
          }))}
        />
        <ChipLine
          label="인분"
          options={SERVINGS_OPTIONS.map((s) => ({
            label: s ?? '전체',
            active: s === draft.servings,
            dim: s !== draft.servings && dead({ servings: s }),
            onPress: () => update({ servings: s }),
          }))}
        />

        <Text style={[styles.section, styles.spaced]}>
          빼고 싶은 재료 <Text style={styles.sectionSub}>못 먹거나 싫은 재료</Text>
        </Text>
        <View style={styles.chips}>
          {excluded.map((name) => (
            <Pressable
              key={name}
              style={({ pressed }) => [styles.excluded, pressed && styles.pressed]}
              onPress={() => update({ excluded: excluded.filter((e) => e !== name) })}
              accessibilityRole="button"
              accessibilityLabel={`${name} 빼기 해제`}>
              <Text style={styles.excludedText}>{name}</Text>
              <Ionicons name="close" size={13} color="#E3A58B" />
            </Pressable>
          ))}
          {adding ? (
            <TextInput
              value={excludeText}
              onChangeText={setExcludeText}
              onSubmitEditing={addExcluded}
              onBlur={addExcluded}
              autoFocus
              placeholder="예: 오이, 고수"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              style={styles.excludeInput}
            />
          ) : (
            <Pressable style={styles.addChip} onPress={() => setAdding(true)} accessibilityRole="button">
              <Text style={styles.addChipText}>+ 추가</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.toggle, styles.spaced]}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>곧 상하는 재료 먼저</Text>
            <Text style={styles.toggleSub} numberOfLines={1}>
              {soonNames.length > 0
                ? `${soonNames.slice(0, 2).join('·')}${soonNames.length > 2 ? ' 등을' : objectParticle(soonNames[Math.min(1, soonNames.length - 1)])} 쓰는 요리를 위로 올려요`
                : '곧 상하는 재료가 생기면 그 재료를 쓰는 요리를 위로 올려요'}
            </Text>
          </View>
          <Switch
            value={draft.soonFirst !== false}
            onValueChange={(v) => update({ soonFirst: v })}
            accessibilityLabel="곧 상하는 재료 먼저"
            {...switchColors}
          />
        </View>
        <View style={styles.toggle}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>냉장고 재료가 들어가는 것만</Text>
            <Text style={styles.toggleSub}>재료가 하나도 없는 레시피는 빼요</Text>
          </View>
          <Switch
            value={draft.preferOwned}
            onValueChange={(v) => update({ preferOwned: v })}
            accessibilityLabel="냉장고 재료가 들어가는 것만"
            {...switchColors}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {now.total === 0 ? (
          <Text style={styles.live}>
            조건에 맞는 레시피가 <Text style={styles.liveZero}>없어요</Text>
            {fix ? `. ${fix.phrase} ${fix.total}개 있어요.` : ''}
          </Text>
        ) : (
          <Text style={styles.live}>
            조건에 맞는 레시피 <Text style={styles.liveCount}>{now.total}개</Text>
            {now.ready > 0 ? ` · 바로 만들 수 있는 것 ${now.ready}개` : ''}
          </Text>
        )}
        <Pressable
          style={({ pressed }) => [styles.button, (pressed || (now.total === 0 && !fix)) && styles.dimButton]}
          disabled={now.total === 0 && !fix}
          onPress={() => submit(fix ? { ...draft, ...fix.patch } : draft)}
          accessibilityRole="button">
          <Text style={styles.buttonText}>
            {now.total > 0 ? `레시피 ${now.total}개 보기` : fix ? `바꾸고 ${fix.total}개 보기` : '레시피 없음'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChipLine({
  label,
  options,
}: {
  label: string;
  options: { label: string; active: boolean; dim: boolean; onPress: () => void }[];
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Pressable
            key={o.label}
            onPress={o.onPress}
            style={[styles.chip, o.active && styles.chipActive, o.dim && styles.dim]}
            accessibilityRole="button"
            accessibilityState={{ selected: o.active }}>
            <Text style={[styles.chipText, o.active && styles.chipTextActive]}>{o.label}</Text>
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
    paddingBottom: spacing.xl,
  },
  reset: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSoft,
  },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  spaced: {
    marginTop: spacing.xl,
  },
  diets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // 한 줄에 3개
  diet: {
    width: '31.5%',
    flexGrow: 1,
    paddingVertical: 10,
    gap: 4,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dietActive: {
    backgroundColor: colors.ink,
  },
  dietText: {
    fontSize: 13,
    color: colors.text,
  },
  dietTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
  dim: {
    opacity: 0.35,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lineLabel: {
    width: 58,
    fontSize: 13,
    color: colors.textSoft,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
  excluded: {
    height: 32,
    paddingLeft: spacing.md,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFF6F1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  excludedText: {
    fontSize: 13,
    color: '#C2360C',
  },
  addChip: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CFCFCC',
    justifyContent: 'center',
  },
  addChipText: {
    fontSize: 13,
    color: colors.textSoft,
  },
  excludeInput: {
    minWidth: 140,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    fontSize: 13,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    color: colors.text,
  },
  toggleSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  live: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSoft,
  },
  liveCount: {
    fontWeight: '700',
    color: '#1F7A47',
  },
  liveZero: {
    fontWeight: '700',
    color: '#C2360C',
  },
  button: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.onInk,
    fontSize: 16,
    fontWeight: '700',
  },
});
