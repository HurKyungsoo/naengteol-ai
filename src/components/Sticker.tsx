import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IngredientIcon } from '@/components/IngredientIcon';
import type { IconName } from '@/data/assets';
import { colors, shadow } from '@/theme';

type Props = {
  icon: IconName;
  size?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
};

/** 흰 테두리가 있는 스티커 느낌의 재료 아이콘 */
export function Sticker({ icon, size = 64, rotate = 0, style }: Props) {
  return (
    <View
      style={[
        styles.sticker,
        { width: size, height: size, borderRadius: size * 0.32, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}>
      <IngredientIcon icon={icon} size={size * 0.72} />
    </View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: shadow.sticker,
  },
});
