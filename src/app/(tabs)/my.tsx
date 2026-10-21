import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppState } from '@/state/AppState';
import { colors, radius, spacing, switchColors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function MyScreen() {
  const { profile, favorites, cookLogs, pantry, updateProfile } = useAppState();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);

  const saveNickname = () => {
    updateProfile({ nickname: nickname.trim() || profile.nickname });
    setEditing(false);
  };

  const menu: { icon: IconName; label: string; href?: Href; onPress?: () => void }[] = [
    { icon: 'heart-outline', label: '즐겨찾기', href: '/favorites' },
    { icon: 'time-outline', label: '조리 기록', href: { pathname: '/pantry', params: { tab: 'history' } } },
    { icon: 'options-outline', label: '추천 조건 설정', href: '/preferences' },
    { icon: 'chatbubble-ellipses-outline', label: '고객센터', href: { pathname: '/info', params: { topic: 'support' } } },
    { icon: 'document-text-outline', label: '이용약관 및 개인정보처리방침', href: { pathname: '/info', params: { topic: 'terms' } } },
    { icon: 'images-outline', label: '사진·아이콘 출처', href: { pathname: '/info', params: { topic: 'credits' } } },
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader back={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.textMuted} />
          </View>
          {editing ? (
            <View style={styles.nameEdit}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                style={styles.nameInput}
                autoFocus
                maxLength={12}
                onSubmitEditing={saveNickname}
                returnKeyType="done"
              />
              <Pressable onPress={saveNickname} hitSlop={8}>
                <Text style={styles.save}>저장</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.nickname}>{profile.nickname}</Text>
              {/* 계정 기능이 없어서 '내 정보'는 닉네임 바꾸기뿐이다 */}
              <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.renameButton} accessibilityRole="button">
                <Ionicons name="pencil-outline" size={13} color={colors.textSoft} />
                <Text style={styles.role}>닉네임 바꾸기</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <Stat label="냉장고 재료" value={pantry.length} />
          <Stat label="즐겨찾기" value={favorites.length} />
          <Stat label="만든 요리" value={cookLogs.length} />
        </View>

        <View style={styles.menu}>
          <View style={styles.menuRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>소비기한 알림</Text>
              <Text style={styles.menuSub}>
                {Platform.OS === 'web' ? '앱에서만 받을 수 있어요' : '소비기한 전날과 당일 저녁 5시에 알려 드려요'}
              </Text>
            </View>
            <Switch
              value={profile.notifications}
              onValueChange={(notifications) => updateProfile({ notifications })}
              accessibilityLabel="소비기한 알림"
              {...switchColors}
            />
          </View>
          {menu.map((m) => (
            <MenuRow key={m.label} {...m} />
          ))}
        </View>
        <Text style={styles.version}>냉털AI v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, href, onPress }: { icon: IconName; label: string; href?: Href; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      onPress={() => (href ? router.push(href) : onPress?.())}
      accessibilityRole="button">
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
    paddingBottom: spacing.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  renameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  role: {
    fontSize: 13,
    color: colors.textSoft,
  },
  nameEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    fontSize: 16,
    color: colors.text,
  },
  save: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  menu: {
    marginTop: spacing.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  version: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
});
