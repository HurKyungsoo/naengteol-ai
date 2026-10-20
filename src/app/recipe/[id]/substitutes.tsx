import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { goBack, ScreenHeader } from '@/components/ScreenHeader';
import { hasIngredient, substitutesFor } from '@/lib/ingredients';
import { matchRecipe, pantryNameSet } from '@/lib/recommend';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';

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
                {options.length > 0 && (
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
                <Text style={styles.note}>
                  대체 재료를 쓰면 맛과 식감이 조금 달라질 수 있어요.
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
});
