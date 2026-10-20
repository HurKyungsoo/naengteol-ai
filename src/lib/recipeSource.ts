/**
 * 서버(Supabase recipes 테이블)의 공공 레시피를 받아 기기에 저장해 둔다.
 * 레시피가 수 MB라서 앱에서는 파일로, 웹 미리보기에서는 브라우저 저장소에 둔다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { SUPABASE_KEY, SUPABASE_URL } from '@/config';
import type { Cuisine, DietTag, Difficulty, Nutrition, Recipe, RecipeIngredient, RecipeStep } from '@/types';

const CACHE_NAME = 'naengteol-recipes-v1.json';
const PAGE_SIZE = 1000; // Supabase(PostgREST) 한 번에 돌려주는 최대 행 수

export type RecipeCache = {
  fetchedAt: number;
  recipes: Recipe[];
};

type RecipeRow = {
  id: string;
  title: string;
  summary: string | null;
  cuisine: Cuisine;
  tags: DietTag[];
  difficulty: Difficulty;
  minutes: number;
  minutes_estimated: boolean;
  servings: number;
  tint: string | null;
  image_url: string | null;
  thumb_url: string | null;
  nutrition: Nutrition | null;
  tip: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

function fromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? '',
    cuisine: row.cuisine,
    tags: row.tags ?? [],
    difficulty: row.difficulty,
    minutes: row.minutes,
    minutesEstimated: row.minutes_estimated,
    servings: row.servings,
    tint: row.tint ?? '#F3EEE6',
    imageUrl: row.image_url ?? undefined,
    thumbUrl: row.thumb_url ?? undefined,
    nutrition: row.nutrition ?? undefined,
    tip: row.tip ?? undefined,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    source: 'foodsafety',
  };
}

export async function fetchRemoteRecipes(): Promise<Recipe[]> {
  const recipes: Recipe[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?select=*&order=id&limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY } },
    );
    if (!res.ok) throw new Error(`레시피를 받지 못했어요 (${res.status})`);
    const rows = (await res.json()) as RecipeRow[];
    recipes.push(...rows.map(fromRow));
    if (rows.length < PAGE_SIZE) return recipes;
  }
}

function cacheFile(): File {
  return new File(Paths.document, CACHE_NAME);
}

export async function readCache(): Promise<RecipeCache | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = await AsyncStorage.getItem(CACHE_NAME);
      return raw ? (JSON.parse(raw) as RecipeCache) : null;
    }
    const file = cacheFile();
    return file.exists ? (JSON.parse(await file.text()) as RecipeCache) : null;
  } catch (e) {
    console.warn('저장된 레시피를 읽지 못했습니다', e);
    return null;
  }
}

export async function writeCache(cache: RecipeCache): Promise<void> {
  try {
    const raw = JSON.stringify(cache);
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(CACHE_NAME, raw);
      return;
    }
    const file = cacheFile();
    if (!file.exists) file.create();
    file.write(raw);
  } catch (e) {
    // 저장에 실패해도 이번 실행에서는 받은 레시피를 그대로 쓴다.
    console.warn('레시피를 저장하지 못했습니다', e);
  }
}
