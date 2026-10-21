import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  addDays,
  BOUGHT_PRESETS,
  daysLeft,
  EXPIRY_COLORS,
  expiringItems,
  expiryLabel,
  expiryLevel,
  expiryOf,
  formatMonthDay,
  isPerishable,
  isTracked,
  needsCheck,
  startOfDay,
} from '@/lib/expiry';
import { matchesUsing, recommendRecipes } from '@/lib/recommend';
import { SHELVES, shelfOf } from '@/lib/shelves';
import { useAppState } from '@/state/AppState';
import { useRecipes } from '@/state/RecipesProvider';
import { colors, radius, spacing } from '@/theme';
import type { PantryItem } from '@/types';

type Tab = 'owned' | 'history';

/** 이 시간 안에 넣은 재료는 냉장고에서 NEW로 표시한다 */
const NEW_MS = 10 * 60 * 1000;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PantryScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const insets = useSafeAreaInsets();
  const { pantry, cookLogs, removeIngredient, setBought } = useAppState();
  const { recipes, findRecipe } = useRecipes();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'owned');
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  // NEW 표시 기준 시각. 탭에 들어올 때마다 갱신한다 (탭 화면은 계속 살아 있으므로).
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  // 마이페이지 "조리 기록"처럼 다른 화면에서 탭을 지정해 들어오는 경우
  const [lastParamTab, setLastParamTab] = useState(params.tab);
  if (params.tab !== lastParamTab) {
    setLastParamTab(params.tab);
    if (params.tab) setTab(params.tab);
  }

  const matches = useMemo(() => recommendRecipes(recipes, pantry, { preferOwned: true }), [recipes, pantry]);
  // 재료가 다 갖춰진 요리가 있을 때만 아래 추천 패널을 띄운다.
  const ready = useMemo(() => matches.filter((m) => m.missing.length === 0), [matches]);
  const soon = useMemo(() => expiringItems(pantry, now), [pantry, now]);
  const unchecked = useMemo(() => needsCheck(pantry), [pantry]);
  const soonRecipes = useMemo(() => matchesUsing(matches, soon).slice(0, 6), [matches, soon]);

  if (tab === 'history') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="사용 기록" back={false} />
        <Pressable style={styles.historyBack} onPress={() => setTab('owned')} hitSlop={8} accessibilityRole="button">
          <Ionicons name="chevron-back" size={16} color={colors.textSoft} />
          <Text style={styles.historyBackText}>냉장고로 돌아가기</Text>
        </Pressable>
        <FlatList
          data={cookLogs}
          keyExtractor={(l) => `${l.recipeId}-${l.cookedAt}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>요리를 완료하면 사용한 재료가 기록돼요.</Text>}
          renderItem={({ item }) => {
            const recipe = findRecipe(item.recipeId);
            return (
              <Pressable
                style={styles.log}
                onPress={() => recipe && router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                {recipe && <RecipeImage recipe={recipe} width={48} height={48} radius={radius.sm} />}
                <View style={styles.logBody}>
                  <View style={styles.logHeader}>
                    <Text style={styles.name}>{recipe?.title ?? '삭제된 레시피'}</Text>
                    <Text style={styles.logDate}>{formatDate(item.cookedAt)}</Text>
                  </View>
                  <Text style={styles.logUsed}>
                    {item.usedIngredients.length > 0 ? `사용: ${item.usedIngredients.join(', ')}` : '정리한 재료 없음'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  // 칸 안에서는 소비기한이 급한 재료부터, 기한을 관리하지 않는 재료는 뒤에 놓는다.
  const order = (p: PantryItem) => (isTracked(p) ? expiryOf(p) : Infinity);
  const shelves = SHELVES.map((s) => ({
    ...s,
    items: pantry.filter((p) => shelfOf(p.name) === s.id).sort((a, b) => order(a) - order(b)),
  })).filter((s) => s.items.length > 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Text style={styles.title}>내 냉장고</Text>
          <Text style={styles.count}>{pantry.length}개</Text>
          <View style={styles.spacer} />
          <Pressable onPress={() => setTab('history')} hitSlop={8} style={styles.iconButton} accessibilityLabel="사용 기록">
            <Ionicons name="time-outline" size={22} color={colors.text} />
          </Pressable>
          {pantry.length > 0 && (
            <Pressable
              onPress={() => setEditMode((v) => !v)}
              style={[styles.editButton, editMode && styles.editButtonOn]}
              accessibilityRole="button">
              <Text style={[styles.editText, editMode && styles.editTextOn]}>{editMode ? '완료' : '편집'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.action, styles.actionDark, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/ingredients/add', params: { focus: '1' } })}
            accessibilityRole="button">
            <Ionicons name="add" size={18} color={colors.onInk} />
            <Text style={styles.actionDarkText}>재료 추가</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/ingredients/add', params: { tab: 'photo' } })}
            accessibilityRole="button">
            <Ionicons name="camera-outline" size={18} color={colors.text} />
            <Text style={styles.actionText}>사진으로 채우기</Text>
          </Pressable>
        </View>

        {unchecked.length > 0 && !editMode && (
          <View style={styles.check}>
            <View style={styles.soonHeader}>
              <Ionicons name="help-circle-outline" size={18} color={colors.textSoft} />
              <Text style={styles.soonTitle}>언제 샀는지 알려 주세요</Text>
              <Text style={styles.checkCount}>{unchecked.length}개</Text>
            </View>
            <Text style={styles.checkSub}>대충 골라도 돼요. 상하기 전에 알려 드릴게요.</Text>
            <View style={styles.soonChips}>
              {unchecked.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.soonChip, pressed && styles.pressed]}
                  onPress={() => setEditing(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} 산 날 정하기`}>
                  <IngredientIcon name={item.name} size={18} />
                  <Text style={styles.soonChipName}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.checkActions}>
              {BOUGHT_PRESETS.map((p) => (
                <Pressable
                  key={p.label}
                  style={({ pressed }) => [styles.checkButton, pressed && styles.pressed]}
                  onPress={() => setBought(unchecked.map((i) => i.id), p.daysAgo)}
                  accessibilityRole="button"
                  accessibilityLabel={`모두 ${p.label}`}>
                  <Text style={styles.checkButtonText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {soon.length > 0 && !editMode && (
          <View style={styles.soon}>
            <View style={styles.soonHeader}>
              <Ionicons name="alarm-outline" size={18} color="#C2360C" />
              <Text style={styles.soonTitle}>곧 상해요</Text>
              <Text style={styles.soonCount}>{soon.length}개</Text>
            </View>
            <View style={styles.soonChips}>
              {soon.map((item) => {
                const days = daysLeft(item, now);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.soonChip, pressed && styles.pressed]}
                    onPress={() => setEditing(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} ${expiryLabel(days)}, 소비기한 수정`}>
                    <IngredientIcon name={item.name} size={18} />
                    <Text style={styles.soonChipName}>{item.name}</Text>
                    <Text style={[styles.soonChipDays, { color: EXPIRY_COLORS[expiryLevel(days)].ink }]}>
                      {expiryLabel(days)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {soonRecipes.length > 0 && (
              <>
                <Text style={styles.soonSub}>이 재료부터 써 볼까요?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelList}>
                  {soonRecipes.map(({ recipe, missing }) => (
                    <Pressable
                      key={recipe.id}
                      style={styles.panelItem}
                      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                      <RecipeImage recipe={recipe} width={104} height={64} radius={12} />
                      <Text style={styles.panelItemTitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>
                      <Text style={missing.length === 0 ? styles.soonReady : styles.soonMissing}>
                        {missing.length === 0 ? '바로 가능' : `${missing.length}개 부족`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}

        <View style={styles.fridge}>
          {shelves.length === 0 && <Text style={styles.fridgeEmpty}>냉장고가 비었어요. 재료를 넣어 볼까요?</Text>}
          {shelves.map((s) => (
            <View key={s.id} style={styles.shelf}>
              <View style={styles.shelfHeader}>
                <Text style={styles.shelfLabel}>{s.label}</Text>
                <Text style={styles.shelfCount}>{s.items.length}개</Text>
              </View>
              <View style={styles.tiles}>
                {s.items.map((item) => {
                  const isNew = !editMode && now - item.addedAt < NEW_MS;
                  const days = daysLeft(item, now);
                  const level = expiryLevel(days);
                  const showExpiry = !editMode && level !== 'ok' && isTracked(item);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.tile, isNew && styles.tileNew, pressed && styles.pressed]}
                      onPress={() => (editMode ? removeIngredient(item.id) : setEditing(item))}
                      accessibilityRole="button"
                      accessibilityLabel={editMode ? `${item.name} 빼기` : `${item.name} 수정`}>
                      <IngredientIcon name={item.name} size={40} />
                      <Text style={styles.tileName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.amount && !editMode && (
                        <Text style={styles.tileAmount} numberOfLines={1}>
                          {item.amount}
                        </Text>
                      )}
                      {editMode && (
                        <View style={styles.minus}>
                          <Ionicons name="remove" size={16} color={colors.onInk} />
                        </View>
                      )}
                      {isNew && <Text style={styles.newBadge}>NEW</Text>}
                      {showExpiry && (
                        <Text
                          style={[
                            styles.expiryBadge,
                            { color: EXPIRY_COLORS[level].text, backgroundColor: EXPIRY_COLORS[level].bg },
                          ]}>
                          {days < 0 ? '지남' : days === 0 ? '오늘' : `D-${days}`}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.shelfLine} />
            </View>
          ))}
        </View>
      </ScrollView>

      {ready.length > 0 && !editMode && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>지금 바로 만들 수 있어요</Text>
            <Text style={styles.panelCount}>{ready.length}개</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.panelList}>
            {ready.slice(0, 8).map(({ recipe }) => (
              <Pressable
                key={recipe.id}
                style={styles.panelItem}
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}>
                <RecipeImage recipe={recipe} width={104} height={56} radius={12} />
                <Text style={styles.panelItemTitle} numberOfLines={1}>
                  {recipe.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [styles.panelButton, pressed && styles.pressed]}
            onPress={() => router.navigate('/recipes')}
            accessibilityRole="button">
            <Text style={styles.panelButtonText}>이 재료로 레시피 보기</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.onInk} />
          </Pressable>
        </View>
      )}

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
    </View>
  );
}

const EXPIRY_PRESETS = [
  { label: '오늘', days: 0 },
  { label: '3일 뒤', days: 3 },
  { label: '1주 뒤', days: 7 },
  { label: '2주 뒤', days: 14 },
  { label: '한 달 뒤', days: 30 },
];

function EditSheet({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { updateIngredient, removeIngredient, setExpiry, setBought } = useAppState();
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount ?? '');
  // 직접 정하지 않았으면 undefined로 두어, 이름을 바꾸면 기본 보관 기간도 따라 바뀌게 한다.
  const [customExpiry, setCustomExpiry] = useState(item.expiresAt);
  // 산 날을 몰랐던 재료에서 "언제 샀어요?"를 고른 값
  const [boughtDaysAgo, setBoughtDaysAgo] = useState<number>();
  const [today] = useState(() => startOfDay(Date.now()));
  const base: PantryItem =
    boughtDaysAgo === undefined
      ? { ...item, name }
      : { ...item, name, boughtUnknown: undefined, boughtAt: addDays(today, -boughtDaysAgo) };
  const expiry = expiryOf({ ...base, expiresAt: customExpiry });
  const askBought = !!item.boughtUnknown && customExpiry === undefined;
  const days = daysLeft({ ...item, expiresAt: expiry }, today);
  const perishable = isPerishable(name);
  const tracked = customExpiry !== undefined || perishable;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.sheetTitleRow}>
          <IngredientIcon name={name} size={28} />
          <Text style={styles.sheetTitle}>재료 수정</Text>
        </View>
        <Text style={styles.label}>이름</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />
        <Text style={styles.label}>양</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="예: 2개, 1/2개, 200g"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {askBought && tracked && (
          <>
            <Text style={styles.label}>언제 샀어요?</Text>
            <View style={styles.expiryQuick}>
              {BOUGHT_PRESETS.map((p) => {
                const on = boughtDaysAgo === p.daysAgo;
                return (
                  <Pressable
                    key={p.label}
                    style={[styles.expiryChip, on && styles.expiryChipOn]}
                    onPress={() => setBoughtDaysAgo(p.daysAgo)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}>
                    <Text style={[styles.expiryChipText, on && styles.expiryChipTextOn]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        <View style={styles.expiryLabelRow}>
          <Text style={styles.label}>소비기한</Text>
          {!tracked ? null : customExpiry === undefined ? (
            <Text style={[styles.expiryHint, base.boughtUnknown && styles.expiryHintWarn]}>
              {base.boughtUnknown
                ? '산 날을 몰라서 짧게 잡았어요'
                : boughtDaysAgo !== undefined
                  ? '산 날 기준으로 계산했어요'
                  : '재료별 기본 보관 기간으로 계산했어요'}
            </Text>
          ) : (
            <Pressable onPress={() => setCustomExpiry(undefined)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.expiryReset}>{perishable ? '기본값으로' : '기한 관리 안 하기'}</Text>
            </Pressable>
          )}
        </View>
        {!tracked ? (
          <View style={styles.untracked}>
            <Text style={styles.untrackedText}>오래 두고 먹는 재료라 기한을 따로 챙기지 않아요.</Text>
            <Pressable
              onPress={() => setCustomExpiry(expiry)}
              hitSlop={8}
              style={({ pressed }) => [styles.untrackedButton, pressed && styles.pressed]}
              accessibilityRole="button">
              <Text style={styles.untrackedButtonText}>기한 직접 정하기</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.expiryRow}>
              <Pressable
                style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}
                onPress={() => setCustomExpiry(Math.max(addDays(today, -1), addDays(expiry, -1)))}
                accessibilityRole="button"
                accessibilityLabel="하루 앞당기기">
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <View style={styles.expiryValue}>
                <Text style={styles.expiryDate}>{formatMonthDay(expiry)}</Text>
                <Text style={[styles.expiryDays, { color: EXPIRY_COLORS[expiryLevel(days)].ink }]}>
                  {expiryLabel(days)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.stepper, pressed && styles.pressed]}
                onPress={() => setCustomExpiry(addDays(expiry, 1))}
                accessibilityRole="button"
                accessibilityLabel="하루 늘리기">
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.expiryQuick}>
              {EXPIRY_PRESETS.map((p) => {
                const value = addDays(today, p.days);
                const on = startOfDay(expiry) === value;
                return (
                  <Pressable
                    key={p.label}
                    style={[styles.expiryChip, on && styles.expiryChipOn]}
                    onPress={() => setCustomExpiry(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}>
                    <Text style={[styles.expiryChipText, on && styles.expiryChipTextOn]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        <View style={styles.sheetButtons}>
          <PrimaryButton
            label="삭제"
            variant="light"
            onPress={() => {
              removeIngredient(item.id);
              onClose();
            }}
          />
          <PrimaryButton
            label="저장"
            onPress={() => {
              updateIngredient(item.id, name, amount);
              if (customExpiry !== item.expiresAt) setExpiry(item.id, customExpiry);
              if (boughtDaysAgo !== undefined) setBought([item.id], boughtDaysAgo);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  count: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSoft,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  editButtonOn: {
    backgroundColor: colors.ink,
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  editTextOn: {
    color: colors.onInk,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionDark: {
    backgroundColor: colors.ink,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actionDarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onInk,
  },
  pressed: {
    opacity: 0.7,
  },
  fridge: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E3E7E7',
    backgroundColor: '#F2F4F4',
  },
  fridgeEmpty: {
    marginVertical: spacing.xl,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSoft,
  },
  shelf: {
    paddingTop: spacing.md,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  shelfLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  shelfCount: {
    fontSize: 12,
    color: colors.textSoft,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // 한 줄에 4개: (칸 너비 - 간격 3개) / 4
  tile: {
    width: '22.9%',
    height: 84,
    borderRadius: radius.lg - 4,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
  },
  tileNew: {
    borderWidth: 2,
    borderColor: '#7CC49A',
  },
  tileName: {
    maxWidth: '90%',
    fontSize: 12,
    color: colors.text,
  },
  tileAmount: {
    maxWidth: '90%',
    fontSize: 10,
    color: colors.textSoft,
  },
  minus: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D9480F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.successSoft,
    color: '#1F7A47',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 14,
  },
  expiryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 14,
  },
  check: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: 10,
    borderRadius: radius.xl - 4,
    backgroundColor: colors.surfaceMuted,
  },
  checkCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSoft,
  },
  checkSub: {
    marginTop: -4,
    fontSize: 12,
    color: colors.textSoft,
  },
  checkActions: {
    flexDirection: 'row',
    gap: 6,
  },
  checkButton: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onInk,
  },
  soon: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: 10,
    borderRadius: radius.xl - 4,
    backgroundColor: '#FFF6F1',
    borderWidth: 1,
    borderColor: '#FFE1D2',
  },
  soonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  soonCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2360C',
  },
  soonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  soonChip: {
    height: 32,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soonChipName: {
    fontSize: 13,
    color: colors.text,
  },
  soonChipDays: {
    fontSize: 12,
    fontWeight: '700',
  },
  soonSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSoft,
  },
  soonReady: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F7A47',
  },
  soonMissing: {
    fontSize: 11,
    color: colors.textSoft,
  },
  shelfLine: {
    marginTop: spacing.md,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E1E6E6',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: spacing.lg,
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    boxShadow: '0px -6px 16px rgba(0, 0, 0, 0.05)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  panelCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F7A47',
  },
  panelList: {
    gap: 10,
  },
  panelItem: {
    width: 104,
    gap: 4,
  },
  panelItemTitle: {
    fontSize: 12,
    color: colors.text,
  },
  panelButton: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  panelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onInk,
  },
  historyBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  historyBackText: {
    fontSize: 13,
    color: colors.textSoft,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: 14,
    color: colors.textSoft,
  },
  name: {
    fontSize: 15,
    color: colors.text,
  },
  log: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logBody: {
    flex: 1,
    gap: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logDate: {
    fontSize: 13,
    color: colors.textSoft,
  },
  logUsed: {
    fontSize: 13,
    color: colors.textSoft,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.textSoft,
  },
  input: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    fontSize: 15,
    color: colors.text,
  },
  expiryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  expiryHint: {
    flexShrink: 1,
    marginLeft: spacing.sm,
    textAlign: 'right',
    fontSize: 12,
    color: colors.textMuted,
  },
  expiryHintWarn: {
    color: '#9A5B00',
  },
  expiryReset: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
    textDecorationLine: 'underline',
  },
  untracked: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  untrackedText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSoft,
  },
  untrackedButton: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  untrackedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepper: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryValue: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  expiryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  expiryDays: {
    fontSize: 13,
    fontWeight: '700',
  },
  expiryQuick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  expiryChip: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  expiryChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  expiryChipText: {
    fontSize: 12,
    color: colors.text,
  },
  expiryChipTextOn: {
    color: colors.onInk,
    fontWeight: '700',
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
