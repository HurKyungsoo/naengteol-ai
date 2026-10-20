import { hasIngredient, isMainIngredient, normalizeIngredient, substitutesFor } from '@/lib/ingredients';
import type { Cuisine, Diet, PantryItem, Preferences, Recipe, RecipeIngredient } from '@/types';

export type MissingIngredient = {
  ingredient: RecipeIngredient;
  /** 냉장고에 있는 대체 재료 */
  availableSubstitutes: string[];
  /** 요리 이름에 들어간 주재료 (배숙의 배) */
  main: boolean;
};

export type RecipeMatch = {
  recipe: Recipe;
  /** 냉장고에 있는 핵심 재료 */
  have: RecipeIngredient[];
  /** 냉장고에 없는 핵심 재료 */
  missing: MissingIngredient[];
  /** 핵심 재료 중 보유(대체 포함) 비율, 0~1 */
  coverage: number;
};

const QUICK_MINUTES = 15;

/** "약 35분"처럼 추정값이면 "약"을 붙인다 */
export function formatMinutes(recipe: Pick<Recipe, 'minutes' | 'minutesEstimated'>): string {
  return `${recipe.minutesEstimated ? '약 ' : ''}${recipe.minutes}분`;
}

/** 기본 양념과 선택 재료를 뺀, 레시피를 만드는 데 꼭 필요한 재료 */
export function coreIngredients(recipe: Recipe): RecipeIngredient[] {
  return recipe.ingredients.filter((i) => !i.seasoning && !i.optional);
}

export function pantryNameSet(pantry: PantryItem[]): Set<string> {
  return new Set(pantry.map((item) => normalizeIngredient(item.name)));
}

export function matchesDiet(recipe: Recipe, diet: Diet): boolean {
  if (diet === '한식') return recipe.cuisine === '한식';
  if (diet === '빠른조리') return recipe.minutes <= QUICK_MINUTES;
  return recipe.tags.includes(diet);
}

/** 상단 탭 필터: 요리 종류(한식·양식…) 또는 식단(다이어트…) */
export function matchesTab(recipe: Recipe, tab: Cuisine | Diet | undefined): boolean {
  if (!tab) return true;
  if (tab === '양식' || tab === '중식' || tab === '간식') return recipe.cuisine === tab;
  return matchesDiet(recipe, tab);
}

export function matchRecipe(recipe: Recipe, owned: Set<string>): RecipeMatch {
  const have: RecipeIngredient[] = [];
  const missing: MissingIngredient[] = [];

  for (const ingredient of coreIngredients(recipe)) {
    if (hasIngredient(owned, ingredient.name)) {
      have.push(ingredient);
    } else {
      const availableSubstitutes = substitutesFor(ingredient.name).filter((s) => hasIngredient(owned, s));
      const main = isMainIngredient(
        recipe.title,
        ingredient.name,
        recipe.ingredients.map((i) => i.name),
      );
      missing.push({ ingredient, availableSubstitutes, main });
    }
  }

  const core = have.length + missing.length;
  // 요리 이름에 들어간 주재료는 바꾸면 다른 요리가 되기 쉬워서 대체 재료로 쳐 주지 않는다.
  const substituted = missing.filter((m) => !m.main && m.availableSubstitutes.length > 0).length;
  // 대체 재료로 채운 경우는 절반만 인정한다.
  const coverage = core === 0 ? 0 : (have.length + substituted * 0.5) / core;

  return { recipe, have, missing, coverage };
}

function matchesPreferences(recipe: Recipe, prefs: Preferences): boolean {
  if (prefs.diet && !matchesDiet(recipe, prefs.diet)) return false;
  if (prefs.maxMinutes && recipe.minutes > prefs.maxMinutes) return false;
  if (prefs.difficulty && recipe.difficulty !== prefs.difficulty) return false;
  if (prefs.servings === '1~2인' && recipe.servings > 2) return false;
  if (prefs.servings === '3인 이상' && recipe.servings < 3) return false;
  return true;
}

/**
 * 보유 재료와 조건으로 레시피를 추천한다.
 * preferOwned면 핵심 재료를 하나도 갖고 있지 않은 레시피는 뺀다.
 * 보유 비율이 높고 조리 시간이 짧은 순으로 정렬한다.
 */
export function recommendRecipes(
  recipes: Recipe[],
  pantry: PantryItem[],
  prefs: Preferences = { preferOwned: true },
): RecipeMatch[] {
  const owned = pantryNameSet(pantry);

  return recipes
    .filter((r) => matchesPreferences(r, prefs))
    .map((r) => matchRecipe(r, owned))
    .filter((m) => !prefs.preferOwned || m.have.length > 0)
    .sort((a, b) => b.coverage - a.coverage || a.recipe.minutes - b.recipe.minutes);
}
