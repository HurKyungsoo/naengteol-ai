import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecipeImage } from '@/components/RecipeImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RECIPE_PHOTOS } from '@/data/assets';
import { RECIPES } from '@/data/recipes';
import { colors, radius, spacing } from '@/theme';

// 출시 전에 실제 고객센터 연락처와 약관 문서로 채운다.
const CONTENT = {
  support: {
    title: '고객센터',
    body: '고객센터 안내는 준비 중이에요.\n출시 전에 문의 방법(이메일, 채팅 등)을 여기에 안내할 예정이에요.',
  },
  terms: {
    title: '이용약관 및 개인정보처리방침',
    body:
      '약관 문서는 준비 중이에요.\n\n현재 버전에서 등록한 재료, 즐겨찾기, 조리 기록은 이 기기에만 저장되고 서버로 전송되지 않아요. ' +
      '사진 분석 기능을 서버와 연결하면 촬영한 사진이 재료 인식을 위해 전송되며, 그 내용은 정식 약관에 안내할 예정이에요.',
  },
  credits: {
    title: '사진·아이콘 출처',
    body:
      '레시피 사진은 Unsplash 라이선스로 제공된 사진이에요.\n' +
      '재료 아이콘은 Microsoft Fluent Emoji (MIT License, Copyright (c) Microsoft Corporation)를 사용했어요.',
  },
};

export default function InfoScreen() {
  const { topic } = useLocalSearchParams<{ topic?: keyof typeof CONTENT }>();
  const key = topic && topic in CONTENT ? topic : 'support';
  const content = CONTENT[key];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={content.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{content.body}</Text>
        {key === 'credits' && <PhotoCredits />}
      </ScrollView>
    </View>
  );
}

function PhotoCredits() {
  return (
    <View style={styles.credits}>
      {RECIPES.flatMap((recipe) => {
        const photo = RECIPE_PHOTOS[recipe.id];
        if (!photo) return [];
        return [
          <Pressable
            key={recipe.id}
            style={styles.creditRow}
            onPress={() => Linking.openURL(photo.credit.photoUrl)}
            accessibilityRole="link">
            <RecipeImage recipe={recipe} width={44} height={44} radius={radius.sm} />
            <View style={styles.creditBody}>
              <Text style={styles.creditTitle}>{recipe.title}</Text>
              <Text style={styles.creditAuthor}>Photo by {photo.credit.author} on Unsplash</Text>
            </View>
          </Pressable>,
        ];
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSoft,
  },
  credits: {
    marginTop: spacing.xl,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  creditBody: {
    flex: 1,
    gap: 2,
  },
  creditTitle: {
    fontSize: 14,
    color: colors.text,
  },
  creditAuthor: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
