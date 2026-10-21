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

/** 썰기: 재료 수에 따라 도마 위 자리 [left, top, 크기, 조각 수, 조각 간격]. 첫 재료(주인공)가 가장 크다. */
const BOARD_SPOTS: [number, number, number, number, number][][] = [
  [[48, 106, 130, 4, 10]],
  [[14, 112, 110, 4, 7], [148, 126, 86, 3, 5]],
  [[10, 118, 104, 4, 6], [138, 90, 80, 3, 5], [146, 158, 78, 3, 5]],
];

/** 냄비·팬·볼·접시: 재료 수에 따라 [가운데 x, 가운데 y, 크기] (scene.at 크기에 대한 비율). 주인공은 앞자리. */
const CLUSTER: [number, number, number][][] = [
  [[0, 0, 1]],
  [[-0.26, 0.06, 0.82], [0.3, -0.06, 0.74]],
  [[0, 0.12, 0.74], [-0.34, -0.1, 0.66], [0.34, -0.1, 0.66]],
];

type Props = {
  kind: Exclude<StepKind, 'roll'>;
  /** 장면 속 재료 이름 (1~3개, 첫 번째가 주인공) */
  ingredients: string[];
  size: number;
};

/**
 * "도마 위에서 썰린 양파·당근", "냄비 속 애호박·감자"처럼 동작과 재료를 한 장면에 보여 준다.
 * 썰기는 재료 아이콘을 세로 조각으로 나눠 벌려 놓고, 자른 면을 밝게 칠한다.
 * 재료가 여럿이면 썰기는 도마 위에 나란히, 나머지는 그릇 안에 모아 담는다.
 */
export function StepScene({ kind, ingredients, size }: Props) {
  const k = size / 256;
  const scene = SCENES[kind];
  const sources = ingredients.slice(0, 3).map((name) => ICONS[ingredientIcon(name)]);
  const fill = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };

  // 뒤 재료부터 그려 주인공이 맨 앞에 오게 한다
  let body: React.ReactNode;
  if (kind === 'knife') {
    const spots = BOARD_SPOTS[sources.length - 1];
    body = sources
      .map((source, n) => {
        const [left, top, box, count, gap] = spots[n];
        return <Sliced key={n} source={source} k={k} left={left} top={top} box={box} count={count} gap={gap} />;
      })
      .reverse();
  } else {
    const [left, top, box] = scene.at;
    const cx = left + box / 2;
    const cy = top + box / 2;
    const spots = CLUSTER[sources.length - 1];
    body = sources
      .map((source, n) => {
        const [dx, dy, scale] = spots[n];
        const b = box * scale;
        const x = cx + dx * box - b / 2;
        const y = cy + dy * box - b / 2;
        return <Image key={n} source={source} style={{ position: 'absolute', left: x * k, top: y * k, width: b * k, height: b * k }} />;
      })
      .reverse();
  }

  return (
    <View style={{ width: size, height: size }}>
      {scene.back.map((layer, i) => (
        <Image key={`b${i}`} source={layer} style={fill} resizeMode="contain" />
      ))}
      {body}
      {scene.front.map((layer, i) => (
        <Image key={`f${i}`} source={layer} style={fill} resizeMode="contain" />
      ))}
    </View>
  );
}

/** 재료 하나를 count조각으로 썰어 벌려 놓은 모습 */
function Sliced({ source, k, left, top, box, count, gap }: { source: ImageSourcePropType; k: number; left: number; top: number; box: number; count: number; gap: number }) {
  const sw = box / count;
  return Array.from({ length: count }, (_, i) => (
    <View
      key={i}
      style={[
        styles.slice,
        {
          left: (left + i * (sw + gap)) * k,
          top: (top + (i % 2) * 5) * k,
          width: sw * k,
          height: box * k,
          transform: [{ rotate: `${(i - (count - 1) / 2) * -4}deg` }],
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
  ));
}

const styles = StyleSheet.create({
  slice: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
