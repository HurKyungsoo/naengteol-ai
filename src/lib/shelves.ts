import type { IconName } from '@/data/assets';
import { ingredientIcon } from '@/lib/icons';

/** 냉장고 탭의 칸. 재료 아이콘 종류로 나눈다. */
export type ShelfId = 'produce' | 'protein' | 'etc';

export const SHELVES: { id: ShelfId; label: string }[] = [
  { id: 'produce', label: '채소 · 과일' },
  { id: 'protein', label: '고기 · 해산물 · 달걀 · 유제품' },
  { id: 'etc', label: '두부 · 김치 · 기타' },
];

const PRODUCE = new Set<IconName>([
  'leafy-green', 'onion', 'green-onion', 'potato', 'sweet-potato', 'cucumber', 'eggplant', 'carrot',
  'hot-pepper', 'tomato', 'bell-pepper', 'broccoli', 'corn', 'avocado', 'garlic', 'mushroom', 'cabbage',
  'zucchini', 'daikon', 'pumpkin', 'chives', 'perilla', 'herb', 'ginger', 'ginseng', 'asparagus', 'beet',
  'celery', 'peas', 'apple', 'banana', 'lemon', 'orange', 'pear', 'pineapple', 'kiwi', 'strawberry',
  'blueberry', 'jujube', 'chestnut',
]);

const PROTEIN = new Set<IconName>([
  'egg', 'bacon', 'cut-of-meat', 'poultry-leg', 'meat-on-bone', 'hot-dog', 'fish', 'shrimp', 'squid',
  'clam', 'canned-food', 'milk', 'cheese', 'butter',
]);

export function shelfOf(name: string): ShelfId {
  const icon = ingredientIcon(name);
  if (PRODUCE.has(icon)) return 'produce';
  if (PROTEIN.has(icon)) return 'protein';
  return 'etc';
}
