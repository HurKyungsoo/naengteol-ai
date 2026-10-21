import { expiringItems } from '@/lib/expiry';
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
  /** 이 레시피가 쓰는 곧 상하는 냉장고 재료 (recommendRecipes에서 채운다) */
  soon: string[];
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

  return { recipe, have, missing, coverage, soon: [] };
}

/** 빼고 싶은 재료가 하나라도 들어가면 true. 양념·선택 재료도 본다 (못 먹는 재료일 수 있어서). */
export function usesExcluded(recipe: Recipe, excluded: string[] | undefined): boolean {
  if (!excluded?.length) return false;
  const keys = excluded.map((e) => new Set([normalizeIngredient(e)]));
  return recipe.ingredients.some((i) => keys.some((k) => hasIngredient(k, i.name)));
}

/** 식단·시간·난이도·인분·빼고 싶은 재료 조건 (냉장고 재료와 상관없는 것들) */
export function matchesPreferences(recipe: Recipe, prefs: Preferences): boolean {
  if (prefs.diet && !matchesDiet(recipe, prefs.diet)) return false;
  if (prefs.maxMinutes && recipe.minutes > prefs.maxMinutes) return false;
  if (prefs.difficulty && recipe.difficulty !== prefs.difficulty) return false;
  if (prefs.servings === '1~2인' && recipe.servings > 2) return false;
  if (prefs.servings === '3인 이상' && recipe.servings < 3) return false;
  if (usesExcluded(recipe, prefs.excluded)) return false;
  return true;
}

/**
 * 냉장고 재료 기준으로 레시피를 한 번만 나눠 둔다. 조건 화면에서 칩을 누를 때마다
 * 전체 추천을 다시 돌리지 않고 개수만 빠르게 셀 수 있게 한다.
 */
export function pantryCoverage(recipes: Recipe[], pantry: PantryItem[]) {
  const owned = pantryNameSet(pantry);
  const usable = new Set<string>();
  const ready = new Set<string>();
  for (const recipe of recipes) {
    const m = matchRecipe(recipe, owned);
    if (m.have.length > 0) usable.add(recipe.id);
    if (m.have.length > 0 && m.missing.length === 0) ready.add(recipe.id);
  }
  return { usable, ready };
}

/** 조건에 맞는 레시피 수와 그중 바로 만들 수 있는 수 */
export function countRecipes(
  recipes: Recipe[],
  prefs: Preferences,
  coverage: ReturnType<typeof pantryCoverage>,
): { total: number; ready: number } {
  let total = 0;
  let ready = 0;
  for (const r of recipes) {
    if (!matchesPreferences(r, prefs)) continue;
    if (prefs.preferOwned && !coverage.usable.has(r.id)) continue;
    total += 1;
    if (coverage.ready.has(r.id)) ready += 1;
  }
  return { total, ready };
}

/**
 * items(급한 순으로 정렬된 재료)를 하나라도 쓰는 추천만 남긴다.
 * 만들기 쉬운(보유 비율이 높은) 요리를 먼저, 같으면 더 급한 재료를 쓰는 요리를 먼저 놓는다.
 */
export function matchesUsing(matches: RecipeMatch[], items: PantryItem[]): RecipeMatch[] {
  const owned = items.map((p) => new Set([normalizeIngredient(p.name)]));
  // 쓰는 재료 중 가장 급한 것의 순위. 하나도 안 쓰면 -1.
  const rank = (m: RecipeMatch) => owned.findIndex((o) => m.have.some((i) => hasIngredient(o, i.name)));
  return matches
    .map((m) => ({ m, r: rank(m) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => b.m.coverage - a.m.coverage || a.r - b.r || a.m.recipe.minutes - b.m.recipe.minutes)
    .map(({ m }) => m);
}

/** 곧 상하는 재료를 쓰는 레시피에 더해 주는 점수. 재료 한두 개 더 부족해도 위로 올라올 만큼. */
const SOON_BONUS = 0.25;

/**
 * 보유 재료와 조건으로 레시피를 추천한다.
 * preferOwned면 핵심 재료를 하나도 갖고 있지 않은 레시피는 뺀다.
 * 보유 비율이 높고 조리 시간이 짧은 순으로 정렬하고, soonFirst면 곧 상하는 재료를 쓰는 레시피를 올린다.
 */
export function recommendRecipes(
  recipes: Recipe[],
  pantry: PantryItem[],
  prefs: Preferences = { preferOwned: true },
): RecipeMatch[] {
  const owned = pantryNameSet(pantry);
  const soon = expiringItems(pantry).map((p) => ({ name: p.name, key: new Set([normalizeIngredient(p.name)]) }));
  const boost = prefs.soonFirst !== false;
  const score = (m: RecipeMatch) => m.coverage + (boost && m.soon.length > 0 ? SOON_BONUS : 0);

  return recipes
    .filter((r) => matchesPreferences(r, prefs))
    .map((r) => {
      const m = matchRecipe(r, owned);
      m.soon = soon.filter((s) => m.have.some((i) => hasIngredient(s.key, i.name))).map((s) => s.name);
      return m;
    })
    .filter((m) => !prefs.preferOwned || m.have.length > 0)
    .sort((a, b) => score(b) - score(a) || a.recipe.minutes - b.recipe.minutes);
}
