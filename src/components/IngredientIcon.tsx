import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { ICONS, type IconName } from '@/data/assets';
import { ingredientIcon } from '@/lib/icons';

type Props = {
  /** 재료 이름 (예: "계란") */
  name?: string;
  /** 재료가 아닌 아이콘을 직접 지정할 때 (예: 홈 카테고리) */
  icon?: IconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Fluent Emoji 3D 재료 아이콘 */
export function IngredientIcon({ name, icon, size = 24, style }: Props) {
  const key = icon ?? ingredientIcon(name ?? '');
  return (
    <Image
      source={ICONS[key]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
