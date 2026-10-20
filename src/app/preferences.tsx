import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BottomBar, PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, switchColors } from '@/theme';
import type { Diet, Difficulty, Preferences, ServingsOption } from '@/types';

const DIET_OPTIONS: { id: Diet; label: string }[] = [
  { id: '한식', label: '일반식·한식' },
  { id: '다이어트', label: '다이어트식' },
  { id: '고단백', label: '고단백 식단' },
  { id: '자취', label: '자취·간편식' },
  { id: '저예산', label: '저예산 식단' },
  { id: '빠른조리', label: '빠른 조리' },
];

type Row = 'time' | 'difficulty' | 'servings';

const TIME_OPTIONS: { value?: number; label: string }[] = [
  { label: '전체' },
  { value: 10, label: '10분 이내' },
  { value: 20, label: '20분 이내' },
  { value: 30, label: '30분 이내' },
];
const DIFFICULTY_OPTIONS: (Difficulty | undefined)[] = [undefined, '쉬움', '보통', '어려움'];
const SERVINGS_OPTIONS: (ServingsOption | undefined)[] = [undefined, '1~2인', '3인 이상'];

export default function PreferencesScreen() {
  const { preferences, setPreferences } = useAppState();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [open, setOpen] = useState<Row | null>(null);

  const update = (patch: Partial<Preferences>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    setPreferences(draft);
    router.navigate('/recipes');
  };

  const timeLabel = TIME_OPTIONS.find((t) => t.value === draft.maxMinutes)?.label ?? '전체';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="식단 및 조건 선택" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>원하는 식단을 선택하세요</Text>
        <View style={styles.diets}>
          {DIET_OPTIONS.map((d) => {
            const active = draft.diet === d.id;
            return (
              <Pressable
                key={d.id}
                style={[styles.diet, active && styles.dietActive]}
                onPress={() => update({ diet: active ? undefined : d.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Text style={[styles.dietText, active && styles.dietTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {(draft.diet === '다이어트' || draft.diet === '고단백') && (
          <Text style={styles.hint}>
            다이어트식·고단백 식단은 메뉴를 고르기 위한 분류예요. 의학적 효과나 영양 목표 달성을 보장하지 않아요.
          </Text>
        )}

        <Text style={[styles.sectionTitle, styles.spaced]}>추가 조건을 설정하세요</Text>

        <OptionRow
          label="조리 시간"
          value={timeLabel}
          open={open === 'time'}
          onToggle={() => setOpen(open === 'time' ? null : 'time')}
          options={TIME_OPTIONS.map((t) => ({ label: t.label, active: t.value === draft.maxMinutes, onPress: () => update({ maxMinutes: t.value }) }))}
        />
        <OptionRow
          label="난이도"
          value={draft.difficulty ?? '전체'}
          open={open === 'difficulty'}
          onToggle={() => setOpen(open === 'difficulty' ? null : 'difficulty')}
          options={DIFFICULTY_OPTIONS.map((d) => ({ label: d ?? '전체', active: d === draft.difficulty, onPress: () => update({ difficulty: d }) }))}
        />
        <OptionRow
          label="인분수"
          value={draft.servings ?? '전체'}
          open={open === 'servings'}
          onToggle={() => setOpen(open === 'servings' ? null : 'servings')}
          options={SERVINGS_OPTIONS.map((s) => ({ label: s ?? '전체', active: s === draft.servings, onPress: () => update({ servings: s }) }))}
        />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>보유 재료 우선 사용</Text>
          <Switch
            value={draft.preferOwned}
            onValueChange={(v) => update({ preferOwned: v })}
            {...switchColors}
          />
        </View>
        <Text style={styles.hint}>
          켜 두면 냉장고 재료가 하나도 안 들어가는 레시피는 빼고 보여줘요.
        </Text>
      </ScrollView>
      <BottomBar>
        <PrimaryButton label="추천받기" onPress={submit} />
      </BottomBar>
    </View>
  );
}

function OptionRow({
  label,
  value,
  open,
  onToggle,
  options,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: { label: string; active: boolean; onPress: () => void }[];
}) {
  return (
    <View>
      <Pressable style={styles.row} onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowValue}>
          <Text style={styles.rowValueText}>{value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.textMuted} />
        </View>
      </Pressable>
      {open && (
        <View style={styles.options}>
          {options.map((o) => (
            <Pressable
              key={o.label}
              onPress={o.onPress}
              style={[styles.option, o.active && styles.optionActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: o.active }}>
              <Text style={[styles.optionText, o.active && styles.optionTextActive]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  spaced: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  diets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  diet: {
    width: '48.5%',
    flexGrow: 1,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dietActive: {
    backgroundColor: colors.ink,
  },
  dietText: {
    fontSize: 14,
    color: colors.text,
  },
  dietTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text,
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValueText: {
    fontSize: 14,
    color: colors.textSoft,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  option: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionText: {
    fontSize: 13,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.onInk,
    fontWeight: '700',
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
});
