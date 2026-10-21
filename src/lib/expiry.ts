import type { IconName } from '@/data/assets';
import { ingredientIcon } from '@/lib/icons';
import { normalizeIngredient } from '@/lib/ingredients';
import type { PantryItem } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 냉장 보관 기준 대략의 소비기한(일). 아이콘 종류로 나눈다. 없으면 DEFAULT_DAYS. */
const DAYS_BY_ICON: Partial<Record<IconName, number>> = {
  // 잎채소·허브는 빨리 시든다
  'leafy-green': 4, perilla: 4, chives: 4, herb: 5, 'green-onion': 7, asparagus: 4,
  broccoli: 5, mushroom: 5, corn: 3, peas: 3,
  cucumber: 7, eggplant: 7, zucchini: 7, tomato: 7, 'hot-pepper': 10, 'bell-pepper': 10,
  celery: 10, daikon: 10, cabbage: 14, carrot: 14, beet: 14, ginseng: 14,
  onion: 30, potato: 30, 'sweet-potato': 21, garlic: 21, ginger: 21, pumpkin: 30,
  // 과일
  strawberry: 3, avocado: 4, pineapple: 4, banana: 5, blueberry: 7, kiwi: 14, jujube: 14,
  chestnut: 14, apple: 30, pear: 21, lemon: 21, orange: 21,
  // 고기·해산물·달걀·유제품
  'poultry-leg': 2, fish: 2, shrimp: 2, squid: 2, clam: 2,
  bacon: 3, 'cut-of-meat': 3, 'meat-on-bone': 3, 'hot-dog': 14,
  egg: 21, milk: 7, cheese: 21, butter: 60, 'canned-food': 365,
  // 기타
  tofu: 5, eomuk: 7, 'cooked-rice': 3, 'rice-cake': 3, bread: 4, flatbread: 4, noodles: 30,
  kimchi: 60, gim: 60, kelp: 180, walnut: 90, almond: 90, peanut: 90,
  doenjang: 180, gochujang: 180, 'soy-sauce': 365, salt: 365, honey: 365, ketchup: 90,
  sesame: 90, curry: 180, cinnamon: 365, jar: 90, 'pouring-liquid': 180, olive: 180,
};

/** 아이콘이 같아도 보관 기간이 크게 다른 재료 */
const DAYS_BY_NAME: Record<string, number> = {
  쌀: 180, 찹쌀: 180, 현미: 180, 흑미: 180,
  베이컨: 14, 햄: 14, 소시지: 14,
};

const DEFAULT_DAYS = 7;

/** 이 날 수 이하로 남으면 "곧 상해요"로 본다 (오늘·내일·모레·글피) */
export const SOON_DAYS = 3;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function shelfLifeDays(name: string): number {
  return DAYS_BY_NAME[normalizeIngredient(name)] ?? DAYS_BY_ICON[ingredientIcon(name)] ?? DEFAULT_DAYS;
}

/**
 * 직접 정한 소비기한이 없으면 산 날 + 기본 보관 기간.
 * 산 날을 모르면 보관 기간의 절반쯤 지났다고 보고 짧게 잡는다 (넉넉하게 잡아 상한 걸 놓치지 않도록).
 */
export function expiryOf(item: PantryItem): number {
  if (item.expiresAt !== undefined) return item.expiresAt;
  const days = shelfLifeDays(item.name);
  if (item.boughtUnknown) return addDays(item.addedAt, Math.max(1, Math.ceil(days / 2)));
  return addDays(item.boughtAt ?? item.addedAt, days);
}

/** 기본 보관 기간이 이보다 긴 재료(양념·김치·양파·쌀…)는 기한을 관리하지 않는다. 알림만 늘고 중요한 게 묻혀서. */
const TRACK_MAX_DAYS = 14;

export function isPerishable(name: string): boolean {
  return shelfLifeDays(name) <= TRACK_MAX_DAYS;
}

/** 기한을 보여 주고 알릴 재료인지. 오래 가는 재료라도 직접 기한을 정했으면 관리한다. */
export function isTracked(item: PantryItem): boolean {
  return item.expiresAt !== undefined || isPerishable(item.name);
}

/** 소비기한을 직접 정하지 않았고 산 날도 몰라서 추정한 값인지 */
export function isEstimated(item: PantryItem): boolean {
  return item.expiresAt === undefined && !!item.boughtUnknown;
}

/** 오늘이면 0, 지났으면 음수 */
export function daysLeft(item: PantryItem, now = Date.now()): number {
  return Math.round((startOfDay(expiryOf(item)) - startOfDay(now)) / DAY_MS);
}

export type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'ok';

export function expiryLevel(days: number): ExpiryLevel {
  if (days < 0) return 'expired';
  if (days <= 1) return 'urgent';
  if (days <= SOON_DAYS) return 'soon';
  return 'ok';
}

export function expiryLabel(days: number): string {
  if (days < 0) return '지났어요';
  if (days === 0) return '오늘까지';
  if (days === 1) return '내일까지';
  return `D-${days}`;
}

/** text·bg: 배지, ink: 흰 바탕 위 글자 */
/** "언제 샀어요?" 빠른 선택. 정확하지 않아도 되니 대충 고르게 한다. */
export const BOUGHT_PRESETS = [
  { label: '오늘 샀어요', daysAgo: 0 },
  { label: '2~3일 전', daysAgo: 3 },
  { label: '일주일쯤 전', daysAgo: 7 },
];

/** 기한을 챙겨야 하는데 산 날을 몰라서 사용자가 확인해 줘야 하는 재료 */
export function needsCheck(pantry: PantryItem[]): PantryItem[] {
  return pantry.filter((p) => isTracked(p) && isEstimated(p));
}

/** 문장으로 쓸 때: "밥 2일 남았어요" */
export function expiryPhrase(days: number): string {
  if (days < 0) return '기한이 지났어요';
  if (days === 0) return '오늘까지예요';
  if (days === 1) return '내일까지예요';
  return `${days}일 남았어요`;
}

export const EXPIRY_COLORS: Record<ExpiryLevel, { text: string; bg: string; ink: string }> = {
  expired: { text: '#FFFFFF', bg: '#D9480F', ink: '#D9480F' },
  urgent: { text: '#C2360C', bg: '#FFE8DE', ink: '#C2360C' },
  soon: { text: '#9A5B00', bg: '#FFF3D6', ink: '#9A5B00' },
  ok: { text: '#6E6E6B', bg: '#F6F6F5', ink: '#6E6E6B' },
};

export function formatMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * 기한을 관리하는 재료 중 SOON_DAYS 안으로 남았거나 지난 재료, 급한 순.
 * 산 날을 몰라 추정한 재료는 사진으로 한꺼번에 넣으면 우르르 들어오므로 빼고 needsCheck로 따로 보여 준다.
 */
export function expiringItems(pantry: PantryItem[], now = Date.now()): PantryItem[] {
  return pantry
    .filter((p) => isTracked(p) && !isEstimated(p) && daysLeft(p, now) <= SOON_DAYS)
    .sort((a, b) => daysLeft(a, now) - daysLeft(b, now));
}
