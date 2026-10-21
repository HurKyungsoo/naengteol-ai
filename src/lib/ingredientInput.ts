import { KNOWN_INGREDIENTS } from '@/lib/icons';
import { normalizeIngredient } from '@/lib/ingredients';
import type { Recipe } from '@/types';

/** 재료 넣기 화면과 사진 분석 결과에서 한 번에 넣을 수 있게 보여 주는 자주 쓰는 재료 */
export const FREQUENT_INGREDIENTS = [
  '계란', '밥', '김치', '두부', '양파', '대파', '감자', '토마토', '돼지고기', '닭가슴살', '참치캔', '양배추',
];

/**
 * 입력창의 재료 목록을 나눈다. "닭 가슴살"처럼 띄어 쓴 재료가 있어서 쉼표(와 줄바꿈)로만 나눈다.
 */
export function splitIngredientInput(text: string): string[] {
  return text
    .split(/[,，\n]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** 앱이 아는 재료 이름: 아이콘 표의 재료 + 레시피에 나오는 모든 재료 (정규화한 이름) */
export function buildVocabulary(recipes: Recipe[]): Set<string> {
  const names = new Set(KNOWN_INGREDIENTS.map(normalizeIngredient));
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) names.add(normalizeIngredient(ingredient.name));
  }
  return names;
}

export type IngredientCheck =
  | { known: true }
  /** invalid: 재료 이름으로 볼 수 없는 입력 ("ㅋㅋ", "!!"). 그래도 넣기를 보여 주지 않는다. */
  | { known: false; invalid: boolean; suggestions: string[] };

// 한글 완성형·영문·숫자로 된 이름만 재료로 본다. "ㅋㅋ", "!!" 같은 입력은 거른다.
const VALID_NAME = /^[가-힣a-zA-Z0-9][가-힣a-zA-Z0-9 ]{0,19}$/;

/**
 * 입력한 이름이 아는 재료인지 본다. "연두부"처럼 아는 재료 앞에 수식어가 붙은 이름도 아는 것으로 본다.
 * 모르는 이름이면 비슷한 재료를 최대 3개 제안한다 (오타 한 글자, 일부만 입력한 경우).
 */
export function checkIngredient(name: string, vocabulary: Set<string>): IngredientCheck {
  const key = normalizeIngredient(name);
  if (!VALID_NAME.test(name.trim())) return { known: false, invalid: true, suggestions: [] };
  if (vocabulary.has(key)) return { known: true };
  for (const v of vocabulary) {
    if (v.length >= 2 && key.length > v.length && key.endsWith(v)) return { known: true };
  }

  const scored: { name: string; score: number }[] = [];
  for (const v of vocabulary) {
    if (v.length < 2) continue;
    let score = Infinity;
    if (v.startsWith(key)) score = v.length - key.length;
    else if (v.includes(key)) score = 10 + v.length - key.length;
    else if (Math.abs(v.length - key.length) <= 1 && editDistance(v, key) === 1) score = 5;
    if (score < Infinity) scored.push({ name: v, score });
  }
  scored.sort((a, b) => a.score - b.score || a.name.length - b.name.length);
  return { known: false, invalid: false, suggestions: scored.slice(0, 3).map((s) => s.name) };
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}
