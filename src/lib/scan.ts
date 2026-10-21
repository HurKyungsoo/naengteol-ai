import type { DetectedIngredient } from '@/lib/analyze';
import { hasIngredient, normalizeIngredient } from '@/lib/ingredients';
import type { PantryItem } from '@/types';

export type ScanResult = {
  /** 사진을 찍은 칸 ("위 칸" 등). 앨범 사진은 없다. */
  label?: string;
  items: DetectedIngredient[];
};

export type MergedIngredient = DetectedIngredient & {
  /** 찾은 칸들 */
  places: string[];
  /** 몇 장의 사진에서 찾았는지. 직접 넣은 재료는 0. */
  seen: number;
};

/** 여러 장에서 같은 재료가 나오면 그만큼 확실하다고 보고 장마다 이만큼 올린다. */
const SEEN_BONUS = 0.1;

/** 사진마다 나온 재료를 이름으로 합친다. 확신도는 가장 높은 값에 여러 장에서 나온 만큼 더한다. */
export function mergeScans(results: ScanResult[]): MergedIngredient[] {
  const byKey = new Map<string, MergedIngredient>();
  for (const { label, items } of results) {
    // 한 장 안에서 같은 재료가 두 번 나오면 한 번으로 친다.
    const inPhoto = new Set<string>();
    for (const item of items) {
      const key = normalizeIngredient(item.name);
      const prev = byKey.get(key);
      const first = !inPhoto.has(key);
      inPhoto.add(key);
      if (!prev) {
        byKey.set(key, { ...item, places: label ? [label] : [], seen: 1 });
        continue;
      }
      prev.confidence = Math.max(prev.confidence, item.confidence);
      if (first) prev.seen += 1;
      if (label && !prev.places.includes(label)) prev.places.push(label);
    }
  }
  return [...byKey.values()]
    .map((m) => ({ ...m, confidence: Math.min(0.99, m.confidence + SEEN_BONUS * (m.seen - 1)) }))
    .sort((a, b) => b.confidence - a.confidence);
}

/** 냉장고 목록에는 있는데 사진에서 찾지 못한 재료 (이름이 겹치면 찾은 것으로 본다) */
export function missingFromScan(pantry: PantryItem[], found: string[]): PantryItem[] {
  const foundKeys = new Set(found.map(normalizeIngredient));
  return pantry.filter((p) => {
    const key = normalizeIngredient(p.name);
    // "연두부"를 찾았으면 "두부"도, "두부"를 찾았으면 "연두부"도 있는 것으로 본다.
    return !hasIngredient(foundKeys, p.name) && !found.some((f) => hasIngredient(new Set([key]), f));
  });
}
