import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

import { ICONS, type IconName } from '@/data/assets';
import { ingredientIcon } from '@/lib/icons';
import { colors } from '@/theme';

type Props = {
  /** 재료 이름 (예: "계란") */
  name?: string;
  /** 재료가 아닌 아이콘을 직접 지정할 때 (예: 홈 카테고리) */
  icon?: IconName;
  size?: number;
  /** 연한 회색 타일 위에 올린다. 목록처럼 작게 보일 때 모양이 또렷해진다. size는 타일 크기 */
  tile?: boolean;
  style?: StyleProp<ImageStyle>;
};

/** 입체 효과를 더한 Flaticon 재료 아이콘 */
export function IngredientIcon({ name, icon, size = 24, tile = false, style }: Props) {
  const key = icon ?? ingredientIcon(name ?? '');
  const iconSize = tile ? Math.round(size * 0.76) : size;
  const image = (
    <Image
      source={ICONS[key]}
      style={[{ width: iconSize, height: iconSize }, !tile && style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
  if (!tile) return image;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {image}
    </View>
  );
}
