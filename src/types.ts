import type { IconName } from '@/data/assets';

/** 요리 종류 (추천·즐겨찾기 상단 탭) */
export type Cuisine = '한식' | '양식' | '중식' | '간식';
export const CUISINES: Cuisine[] = ['한식', '양식', '중식', '간식'];

/** 레시피에 직접 붙이는 식단 태그 */
export type DietTag = '다이어트' | '고단백' | '자취' | '저예산';

/** 사용자가 고르는 식단 (홈 카테고리, 조건 선택 화면). 한식·빠른조리는 레시피 정보로 판단한다. */
export type Diet = '한식' | DietTag | '빠른조리';

export const DIETS: { id: Diet; label: string; icon: IconName }[] = [
  { id: '한식', label: '한식', icon: 'pot-of-food' },
  { id: '다이어트', label: '다이어트식', icon: 'green-salad' },
  { id: '고단백', label: '고단백', icon: 'poultry-leg' },
  { id: '자취', label: '자취요리', icon: 'cooking' },
  { id: '저예산', label: '저예산', icon: 'coin' },
  { id: '빠른조리', label: '빠른조리', icon: 'stopwatch' },
];

export type Difficulty = '쉬움' | '보통' | '어려움';

export type PantryItem = {
  id: string;
  name: string;
  /** 자유 입력 (예: "2개", "1/2개", "200g") */
  amount?: string;
  addedAt: number;
};

export type RecipeIngredient = {
  name: string;
  amount: string;
  /** 소금·간장처럼 대부분 집에 있다고 보는 기본 양념. 추천 점수에서 제외한다. */
  seasoning?: boolean;
  /** 없어도 만들 수 있는 재료. 추천 점수에서 제외한다. */
  optional?: boolean;
};

export type RecipeStep = {
  /** 직접 쓴 샘플 레시피에만 있다 */
  title?: string;
  text: string;
  /** 단계 사진 주소 (공공 레시피) */
  image?: string;
};

/** 1인분 기준 영양정보 (식품안전나라 원본 값) */
export type Nutrition = {
  weight?: number;
  kcal?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium?: number;
};

export type Recipe = {
  id: string;
  title: string;
  /** 사진이 없거나 로딩 중일 때 보이는 배경색 */
  tint: string;
  summary: string;
  cuisine: Cuisine;
  tags: DietTag[];
  difficulty: Difficulty;
  minutes: number;
  /** 원본에 조리 시간이 없어 단계 수로 추정한 값이면 true */
  minutesEstimated?: boolean;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  /** 완성 사진 주소. 없으면 앱에 들어 있는 사진(assets)이나 아이콘을 쓴다 */
  imageUrl?: string;
  thumbUrl?: string;
  nutrition?: Nutrition;
  /** 저감 조리 팁 */
  tip?: string;
  /** 없으면 앱에 들어 있는 샘플 레시피 */
  source?: 'foodsafety';
};

export type CookLog = {
  recipeId: string;
  cookedAt: number;
  usedIngredients: string[];
};

export type ServingsOption = '1~2인' | '3인 이상';

export type Preferences = {
  diet?: Diet;
  maxMinutes?: number;
  difficulty?: Difficulty;
  servings?: ServingsOption;
  /** 보유 재료가 하나도 없는 레시피는 빼고 추천 */
  preferOwned: boolean;
};
