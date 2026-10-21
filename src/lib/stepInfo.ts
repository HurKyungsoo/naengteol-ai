import type { ImageSourcePropType } from 'react-native';

import type { Recipe, RecipeStep } from '@/types';

/** 조리 동작. 단계 사진이 없을 때 사진 자리에 동작 아이콘을 보여 준다 (scripts/make-step-icons.mjs). */
export type StepKind = 'mix' | 'pan' | 'roll' | 'knife' | 'pot' | 'plate';

export const STEP_ICONS: Record<StepKind, ImageSourcePropType> = {
  mix: require('../../assets/steps/mix.png'),
  pan: require('../../assets/steps/pan.png'),
  roll: require('../../assets/steps/roll.png'),
  knife: require('../../assets/steps/knife.png'),
  pot: require('../../assets/steps/pot.png'),
  plate: require('../../assets/steps/plate.png'),
};

// 앞의 규칙이 이긴다. "양파를 볶다가 물을 붓고 끓여"처럼 여러 동작이 섞이면 제목으로 먼저 고른다.
const KIND_RULES: [StepKind, RegExp][] = [
  ['roll', /말아|말기/],
  ['knife', /썰|손질|다지|자르|채 썰/],
  ['plate', /담|올리|곁들|뿌리/],
  ['pot', /끓|삶|졸이|데치|육수|냄비/],
  ['pan', /볶|굽|구워|구우|부치|튀기|익히|스크램블|팬/],
  ['mix', /섞|양념|소스|드레싱|반죽|무치|절이|풀/],
];

/** 단계 동작. 제목에서 먼저 찾고, 없으면 설명에서 찾는다. */
export function stepKind(step: RecipeStep): StepKind {
  for (const source of [step.title ?? '', step.text]) {
    const found = KIND_RULES.find(([, re]) => re.test(source));
    if (found) return found[0];
  }
  return 'mix';
}

/** "5분", "30초"처럼 설명에 적힌 시간 (첫 번째만) */
export function stepTime(step: RecipeStep): string | undefined {
  return step.text.match(/\d+(?:\.\d+)?\s*(?:분|초)/)?.[0].replace(/\s+/g, '');
}

/** "약불", "중불"처럼 설명에 적힌 불 세기 */
export function stepHeat(step: RecipeStep): string | undefined {
  return step.text.match(/중약불|약불|중불|강불|센불/)?.[0];
}

/** 설명에 나오는 레시피 재료 (최대 4개). "다진마늘"은 "마늘"로 적혀 있어도 찾는다. */
export function stepIngredients(recipe: Recipe, step: RecipeStep, max = 4): string[] {
  const found = recipe.ingredients
    .map((i) => i.name)
    .filter((name) => step.text.includes(name) || step.text.includes(name.replace(/^다진/, '')));
  return [...new Set(found)].slice(0, max);
}

/**
 * 단계에 들어가는 주재료 (최대 max개). 제목에 나오는 재료(토마토 볶기 → 토마토)가 먼저, 그다음 설명에 나오는 순서.
 * 양념(소금·식용유 등)은 뺀다. 첫 번째가 주인공이라 장면에서 가장 크게 보여 준다.
 */
export function stepSubjects(recipe: Recipe, step: RecipeStep, max = 3): string[] {
  const main = recipe.ingredients.filter((i) => !i.seasoning).map((i) => i.name);
  const ordered = (source: string) =>
    main
      .map((name) => {
        const i = source.indexOf(name);
        return { name, at: i >= 0 ? i : source.indexOf(name.replace(/^다진/, '')) };
      })
      .filter((x) => x.at >= 0)
      .sort((a, b) => a.at - b.at || b.name.length - a.name.length)
      .map((x) => x.name);
  return [...new Set([...ordered(step.title ?? ''), ...ordered(step.text)])].slice(0, max);
}
