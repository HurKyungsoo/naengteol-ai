import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { RECIPE_PHOTOS, type IconName } from '@/data/assets';
import type { Recipe } from '@/types';

type Props = {
  recipe: Pick<Recipe, 'id' | 'tint' | 'imageUrl' | 'thumbUrl'>;
  width: number | `${number}%`;
  height: number;
  radius?: number;
  /** 큰 화면(상세)이면 큰 사진, 목록이면 작은 사진을 쓴다 */
  size?: 'thumb' | 'full';
  /** 레시피 사진 대신 보여줄 사진 주소 (조리 단계 사진) */
  imageUri?: string;
  /** 사진 대신 재료 아이콘을 보여줄 때 (조리 단계 등) */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

/**
 * 레시피 사진. 우선순위: 지정한 사진 주소 → 앱에 들어 있는 사진 → 공공 레시피 사진 주소 → 재료 아이콘.
 * 사진을 불러오는 동안에는 배경색이 보인다.
 */
export function RecipeImage({ recipe, width, height, radius = 14, size = 'thumb', imageUri, icon, style }: Props) {
  const bundled = RECIPE_PHOTOS[recipe.id]?.source;
  const remote = size === 'full' ? recipe.imageUrl ?? recipe.thumbUrl : recipe.thumbUrl ?? recipe.imageUrl;
  const source = imageUri ? { uri: imageUri } : icon ? undefined : bundled ?? (remote ? { uri: remote } : undefined);
  const iconSize = Math.min(typeof width === 'number' ? width : height, height) * 0.6;

  return (
    <View style={[styles.box, { width, height, borderRadius: radius, backgroundColor: recipe.tint }, style]}>
      {source ? (
        <Image source={source} style={styles.photo} resizeMode="cover" />
      ) : (
        <IngredientIcon icon={icon ?? 'bowl'} size={iconSize} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // absoluteFill만 주면 웹에서 원본 크기로 그려져 일부만 보인다. 크기를 명시한다.
  photo: {
    width: '100%',
    height: '100%',
  },
});
