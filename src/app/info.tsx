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
      '약관 문서는 준비 중이에요.\n\n' +
      '등록한 재료, 즐겨찾기, 조리 기록은 이 기기에만 저장되고 서버로 전송되지 않아요.\n\n' +
      '사진으로 재료를 찾을 때는 선택한 사진이 재료 인식을 위해 분석 서버(Supabase)를 거쳐 Google Gemini API로 전송돼요. ' +
      '사진은 앱 서버에 저장하지 않지만, Google의 무료 이용 등급에서는 전송된 내용이 Google 서비스 개선에 사용될 수 있어요. ' +
      '사람 얼굴이나 개인정보가 담긴 사진은 보내지 않는 것을 권장해요.',
  },
  credits: {
    title: '사진·아이콘 출처',
    body:
      '공공 레시피(사진·조리법·영양정보)는 식품의약품안전처 식품안전나라 "조리식품의 레시피 DB"에서 제공받았어요. ' +
      '조리 시간과 난이도는 원본에 없어 앱에서 추정한 값이에요.\n' +
      '‘AI 보충 설명’은 원본 레시피를 바탕으로 Google Gemini가 만든 설명이며, 원본 레시피 내용은 바꾸지 않아요.\n\n' +
      '샘플 레시피 사진은 Unsplash 라이선스로 제공된 사진이에요.\n' +
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
