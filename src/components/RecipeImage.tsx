import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import { RECIPE_PHOTOS, type IconName } from '@/data/assets';
import type { Recipe } from '@/types';

type Props = {
  recipe: Pick<Recipe, 'id' | 'tint'>;
  width: number | `${number}%`;
  height: number;
  radius?: number;
  /** 사진 대신 재료 아이콘을 보여줄 때 (조리 단계 등) */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

/** 레시피 사진. 사진이 없거나 icon을 지정하면 배경색 위에 재료 아이콘을 보여준다. */
export function RecipeImage({ recipe, width, height, radius = 14, icon, style }: Props) {
  const photo = icon ? undefined : RECIPE_PHOTOS[recipe.id];
  const iconSize = Math.min(typeof width === 'number' ? width : height, height) * 0.6;

  return (
    <View style={[styles.box, { width, height, borderRadius: radius, backgroundColor: recipe.tint }, style]}>
      {photo ? (
        <Image source={photo.source} style={styles.photo} resizeMode="cover" />
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
