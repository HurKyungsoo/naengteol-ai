import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientIcon } from '@/components/IngredientIcon';
import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { RecipeImage } from '@/components/RecipeImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentTabs } from '@/components/Tabs';
import { findRecipe } from '@/data/recipes';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing } from '@/theme';
import type { PantryItem } from '@/types';

type Tab = 'owned' | 'history';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PantryScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const { pantry, cookLogs } = useAppState();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'owned');
  const [editing, setEditing] = useState<PantryItem | null>(null);

  // 마이페이지 "조리 기록"처럼 다른 화면에서 탭을 지정해 들어오는 경우
  const [lastParamTab, setLastParamTab] = useState(params.tab);
  if (params.tab !== lastParamTab) {
    setLastParamTab(params.tab);
    if (params.tab) setTab(params.tab);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="재료 관리" back={false} />
      <View style={styles.tabs}>
        <SegmentTabs
          options={[
            { value: 'owned', label: `보유 재료 ${pantry.length}` },
            { value: 'history', label: '사용 기록' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'owned' ? (
        <FlatList
          data={pantry}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>등록된 재료가 없어요.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setEditing(item)}>
              <IngredientIcon name={item.name} size={28} />
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.spacer} />
              <Text style={styles.amount}>{item.amount ?? '양 입력'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        />
      ) : (
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
      )}

      <BottomBar>
        <PrimaryButton label="재료 추가하기" onPress={() => router.push('/ingredients/add')} />
      </BottomBar>

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
    </View>
  );
}

function EditSheet({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { updateIngredient, removeIngredient } = useAppState();
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount ?? '');

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
  tabs: {
    paddingHorizontal: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 15,
    color: colors.text,
  },
  spacer: {
    flex: 1,
  },
  amount: {
    fontSize: 14,
    color: colors.textSoft,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  input: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    fontSize: 15,
    color: colors.text,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
