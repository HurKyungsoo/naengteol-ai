import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { ICONS } from '@/data/assets';
import { ingredientIcon } from '@/lib/icons';
import type { StepKind } from '@/lib/stepInfo';

/** 장면 레이어 (scripts/make-step-icons.mjs). 모두 같은 256 좌표에 맞춰 그려져 있다. */
const LAYER = {
  board: require('../../assets/steps/layers/board.png'),
  knife: require('../../assets/steps/layers/knife-over.png'),
  pan: require('../../assets/steps/layers/pan-empty.png'),
  potBack: require('../../assets/steps/layers/pot-back.png'),
  potFront: require('../../assets/steps/layers/pot-front.png'),
  bowlBack: require('../../assets/steps/layers/bowl-back.png'),
  bowlFront: require('../../assets/steps/layers/bowl-front.png'),
  plate: require('../../assets/steps/layers/plate-empty.png'),
};

/** 장면마다 [뒤 레이어], 재료 자리(256 좌표의 left·top·크기), [앞 레이어] */
const SCENES: Record<Exclude<StepKind, 'roll'>, { back: ImageSourcePropType[]; at: [number, number, number]; front: ImageSourcePropType[] }> = {
  knife: { back: [LAYER.board], at: [48, 106, 130], front: [LAYER.knife] },
  pan: { back: [LAYER.pan], at: [64, 86, 112], front: [] },
  pot: { back: [LAYER.potBack], at: [68, 22, 120], front: [LAYER.potFront] },
  mix: { back: [LAYER.bowlBack], at: [68, 22, 120], front: [LAYER.bowlFront] },
  plate: { back: [LAYER.plate], at: [68, 78, 120], front: [] },
};

const SLICES = 4;
const SLICE_GAP = 10;

type Props = {
  kind: Exclude<StepKind, 'roll'>;
  /** 장면 속 재료 이름 */
  ingredient: string;
  size: number;
};

/**
 * "도마 위에서 썰린 토마토", "냄비 속 감자"처럼 동작과 재료를 한 장면에 보여 준다.
 * 썰기는 재료 아이콘을 세로 조각으로 나눠 벌려 놓고, 자른 면을 밝게 칠한다.
 */
export function StepScene({ kind, ingredient, size }: Props) {
  const k = size / 256;
  const scene = SCENES[kind];
  const source = ICONS[ingredientIcon(ingredient)];
  const [left, top, box] = scene.at;
  const fill = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };

  return (
    <View style={{ width: size, height: size }}>
      {scene.back.map((layer, i) => (
        <Image key={`b${i}`} source={layer} style={fill} resizeMode="contain" />
      ))}
      {kind === 'knife' ? (
        Array.from({ length: SLICES }, (_, i) => {
          const sw = box / SLICES;
          return (
            <View
              key={i}
              style={[
                styles.slice,
                {
                  left: (left + i * (sw + SLICE_GAP)) * k,
                  top: (top + (i % 2) * 5) * k,
                  width: sw * k,
                  height: box * k,
                  transform: [{ rotate: `${(i - (SLICES - 1) / 2) * -4}deg` }],
                },
              ]}>
              <Image source={source} style={{ position: 'absolute', left: -i * sw * k, width: box * k, height: box * k }} />
              {i > 0 && (
                // 자른 면: 조각 왼쪽 가장자리를 재료 모양 그대로 하얗게 덮어 속살처럼 보이게 한다
                <View style={[styles.slice, { left: 0, top: 0, width: 5 * k, height: box * k }]}>
                  <Image
                    source={source}
                    style={{ position: 'absolute', left: -i * sw * k, width: box * k, height: box * k, tintColor: '#FFFFFF', opacity: 0.55 }}
                  />
                </View>
              )}
            </View>
          );
        })
      ) : (
        <Image source={source} style={{ position: 'absolute', left: left * k, top: top * k, width: box * k, height: box * k }} />
      )}
      {scene.front.map((layer, i) => (
        <Image key={`f${i}`} source={layer} style={fill} resizeMode="contain" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slice: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
