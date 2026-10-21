import type { ImageSourcePropType } from 'react-native';

import type { Recipe, RecipeStep } from '@/types';

/** 조리 동작. 단계 사진이 없을 때 사진 자리에 동작 아이콘을 보여 준다 (scripts/make-step-icons.mjs). */
export type StepKind = 'mix' | 'pan' | 'roll' | 'knife' | 'pot';

export const STEP_ICONS: Record<StepKind, ImageSourcePropType> = {
  mix: require('../../assets/steps/mix.png'),
  pan: require('../../assets/steps/pan.png'),
  roll: require('../../assets/steps/roll.png'),
  knife: require('../../assets/steps/knife.png'),
  pot: require('../../assets/steps/pot.png'),
};

/** 단계 제목·설명에 나오는 말로 동작을 고른다. 여러 동작이 섞이면 앞의 규칙이 이긴다. */
export function stepKind(step: RecipeStep): StepKind {
  const t = `${step.title ?? ''} ${step.text}`;
  if (/말아|말기/.test(t)) return 'roll';
  if (/썰|손질|다지|자르/.test(t)) return 'knife';
  if (/끓|냄비|육수|삶/.test(t)) return 'pot';
  if (/팬|볶|굽|부치|튀기/.test(t)) return 'pan';
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
 * "두부와 다진마늘을 넣고…"처럼 재료를 넣는 단계면 설명에 가장 먼저 나오는 재료.
 * 같은 동작(끓이기)이 이어져도 단계마다 그림이 달라지게, 이 재료를 크게 보여 주고 동작은 작은 배지로 단다.
 */
export function stepAddedIngredient(recipe: Recipe, step: RecipeStep): string | undefined {
  if (!/넣/.test(step.text)) return undefined;
  const at = (name: string) => {
    const i = step.text.indexOf(name);
    return i >= 0 ? i : step.text.indexOf(name.replace(/^다진/, ''));
  };
  return recipe.ingredients
    .map((i) => ({ name: i.name, at: at(i.name) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)[0]?.name;
}
