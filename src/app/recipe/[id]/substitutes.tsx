import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { hasIngredient, substitutesFor } from '@/lib/ingredients';
import { matchRecipe, pantryNameSet } from '@/lib/recommend';
import { useSubstituteCheck, type SubstituteCheckItem, type SubstituteFit } from '@/lib/substituteCheck';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';

const FIT_LABEL: Record<SubstituteFit, string> = { good: '잘 맞아요', ok: '괜찮아요', bad: '이 요리엔 안 맞아요' };
const FIT_ORDER: Record<SubstituteFit, number> = { good: 0, ok: 1, bad: 2 };

/** AI 평가가 좋은 순서로. 평가가 빠진 후보는 "괜찮아요"와 "안 맞아요" 사이에 둔다. */
function sortByFit(options: string[], checked: SubstituteCheckItem) {
  return options
    .map((name) => {
      const c = checked.candidates.find((x) => x.name === name);
      return { name, fit: c?.fit, note: c?.note ?? '' };
    })
    .sort((a, b) => (a.fit ? FIT_ORDER[a.fit] : 1.5) - (b.fit ? FIT_ORDER[b.fit] : 1.5));
}

export default function SubstitutesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findRecipe } = useRecipes();
  const recipe = findRecipe(id);
  const { pantry, addIngredient } = useAppState();
  const owned = useMemo(() => pantryNameSet(pantry), [pantry]);
  const missing = useMemo(() => (recipe ? matchRecipe(recipe, owned).missing : []), [recipe, owned]);
  const [selectedName, setSelectedName] = useState<string | undefined>(missing[0]?.ingredient.name);

  const selected = missing.find((m) => m.ingredient.name === selectedName) ?? missing[0];
  const options = selected ? substitutesFor(selected.ingredient.name) : [];
  const check = useSubstituteCheck(recipe);
  const checked = selected ? check.items?.find((i) => i.name === selected.ingredient.name) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>대체 재료 안내</Text>

        {missing.length === 0 ? (
          <Text style={styles.caption}>부족한 재료가 없어요. 바로 만들 수 있어요!</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>다음 재료가 부족해요</Text>
            <View style={styles.list}>
              {missing.map((m) => {
                const active = m === selected;
                return (
                  <View key={m.ingredient.name} style={[styles.missingCard, active && styles.missingCardActive]}>
                    <IngredientIcon name={m.ingredient.name} size={36} />
                    <View style={styles.missingBody}>
                      <Text style={styles.missingName}>{m.ingredient.name}</Text>
                      <Text style={styles.missingAmount}>필요량 {m.ingredient.amount}</Text>
                    </View>
                    <Pressable
                      style={[styles.viewButton, active && styles.viewButtonActive]}
                      onPress={() => setSelectedName(m.ingredient.name)}>
                      <Text style={[styles.viewButtonText, active && styles.viewButtonTextActive]}>대체 재료 보기</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {selected && (
              <>
                <Text style={[styles.sectionTitle, styles.spaced]}>
                  {options.length > 0
                    ? `${selected.ingredient.name} 대신 이 재료로도 만들 수 있어요`
                    : selected.ingredient.optional
                      ? `${selected.ingredient.name}은(는) 선택 재료라 빼고 만들어도 돼요`
                      : `${selected.ingredient.name}은(는) 아직 등록된 대체 재료가 없어요`}
                </Text>
                {selected.main && (
                  <View style={styles.warning}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.accent} />
                    <Text style={styles.warningText}>
                      요리 이름에 들어간 주재료라, 다른 재료로 바꾸면 맛이 많이 달라질 수 있어요.
                    </Text>
                  </View>
                )}
                {checked && (
                  <View style={styles.aiCard}>
                    <Text style={styles.aiLabel}>AI 확인 · 이 요리에서 {selected.ingredient.name}의 역할</Text>
                    <Text style={styles.aiRole}>{checked.role}</Text>
                    {checked.omit.possible && checked.omit.note !== '' && (
                      <Text style={styles.aiOmit}>빼고 만들어도 돼요. {checked.omit.note}</Text>
                    )}
                  </View>
                )}
                {options.length > 0 && checked && (
                  <View style={styles.rows}>
                    {sortByFit(options, checked).map(({ name, fit, note }) => {
                      const has = hasIngredient(owned, name);
                      return (
                        <View key={name} style={[styles.row, fit === 'bad' && styles.rowBad]}>
                          <IngredientIcon name={name} size={36} />
                          <View style={styles.rowBody}>
                            <View style={styles.rowTitle}>
                              <Text style={styles.optionName}>{name}</Text>
                              {fit && <Text style={[styles.fit, FIT_STYLE[fit]]}>{FIT_LABEL[fit]}</Text>}
                            </View>
                            {note !== '' && <Text style={styles.rowNote}>{note}</Text>}
                          </View>
                          {has ? (
                            <Text style={styles.owned}>보유 중</Text>
                          ) : fit !== 'bad' ? (
                            <Pressable onPress={() => addIngredient(name)} hitSlop={6}>
                              <Text style={styles.add}>+ 추가</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
                {options.length > 0 && !checked && (
                  <View style={styles.grid}>
                    {options.map((name) => {
                      const has = hasIngredient(owned, name);
                      return (
                        <View key={name} style={styles.option}>
                          <IngredientIcon name={name} size={44} />
                          <Text style={styles.optionName}>{name}</Text>
                          {has ? (
                            <Text style={styles.owned}>보유 중</Text>
                          ) : (
                            <Pressable onPress={() => addIngredient(name)} hitSlop={6}>
                              <Text style={styles.add}>+ 냉장고에 추가</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                {check.available && !check.items && (
                  <Pressable
                    style={styles.aiButton}
                    onPress={check.request}
                    disabled={check.loading}
                    accessibilityRole="button">
                    {check.loading ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Ionicons name="sparkles-outline" size={18} color={colors.text} />
                    )}
                    <View style={styles.aiButtonBody}>
                      <Text style={styles.aiButtonTitle}>
                        {check.loading ? '이 요리에 맞는지 확인하는 중…' : '이 요리에 맞는지 AI로 확인'}
                      </Text>
                      <Text style={styles.aiButtonCaption}>
                        {check.error ?? '레시피를 보고 잘 맞는 대체 재료와 양 조절 팁을 알려 드려요.'}
                      </Text>
                    </View>
                  </Pressable>
                )}
                <Text style={styles.note}>
                  대체 재료를 쓰면 맛과 식감이 조금 달라질 수 있어요.
                  {check.items ? ' AI 확인 결과는 참고용이에요.' : ''}
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
      <BottomBar>
        <PrimaryButton label="닫기" onPress={goBack} />
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  caption: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  spaced: {
    marginTop: spacing.xxl,
  },
  list: {
    gap: spacing.sm,
  },
  missingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  missingCardActive: {
    borderColor: colors.ink,
  },
  missingBody: {
    flex: 1,
    gap: 2,
  },
  missingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  missingAmount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewButton: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  viewButtonActive: {
    backgroundColor: colors.ink,
  },
  viewButtonText: {
    fontSize: 12,
    color: colors.textSoft,
  },
  viewButtonTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    width: '31.5%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  optionName: {
    fontSize: 14,
    color: colors.text,
  },
  owned: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  add: {
    fontSize: 11,
    color: colors.textSoft,
  },
  note: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textMuted,
  },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  aiCard: {
    gap: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  aiLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  aiRole: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  aiOmit: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSoft,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  rowBad: {
    opacity: 0.55,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rowNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSoft,
  },
  fit: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fitGood: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
  fitOk: {
    color: colors.textSoft,
    backgroundColor: colors.background,
  },
  fitBad: {
    color: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiButtonBody: {
    flex: 1,
    gap: 2,
  },
  aiButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  aiButtonCaption: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});

const FIT_STYLE: Record<SubstituteFit, object> = { good: styles.fitGood, ok: styles.fitOk, bad: styles.fitBad };
