/**
 * 공공 레시피의 AI 보충 설명 (서버 함수 explain-recipe).
 * 원본 레시피는 그대로 두고, 화면에서 "AI 보충 설명"으로 구분해 보여준다.
 * 받은 설명은 기기에 저장해 다시 요청하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SUPABASE_KEY, SUPABASE_URL } from '@/config';
import type { Recipe } from '@/types';

export type RecipeGuide = {
  overview: string;
  prep: string[];
  steps: { index: number; tips: string[] }[];
  cautions: string[];
};

const CACHE_KEY = 'naengteol/guides/v1';
const TIMEOUT_MS = 30_000;

const ERROR_MESSAGES: Record<number, string> = {
  429: '요청이 많아요. 잠시 후 다시 눌러 주세요.',
  404: '이 레시피는 설명을 만들 수 없어요.',
};

let memory: Record<string, RecipeGuide> | null = null;

async function loadAll(): Promise<Record<string, RecipeGuide>> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memory = raw ? (JSON.parse(raw) as Record<string, RecipeGuide>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

async function save(recipeId: string, guide: RecipeGuide) {
  const all = await loadAll();
  all[recipeId] = guide;
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all)).catch((e) => console.warn('설명을 저장하지 못했습니다', e));
}

async function requestGuide(recipeId: string): Promise<RecipeGuide> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/explain-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ recipeId }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(controller.signal.aborted ? '설명이 너무 오래 걸려요. 다시 눌러 주세요.' : '인터넷 연결을 확인해 주세요.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(ERROR_MESSAGES[res.status] ?? `설명을 만들지 못했어요. (${res.status})`);
  const { guide } = (await res.json()) as { guide: RecipeGuide };
  await save(recipeId, guide);
  return guide;
}

/** 보충 설명은 서버 DB에 원본이 있는 공공 레시피에만 만들 수 있다. */
export function canExplain(recipe: Pick<Recipe, 'source'>): boolean {
  return recipe.source === 'foodsafety';
}

export function useRecipeGuide(recipe: Pick<Recipe, 'id' | 'source'> | undefined) {
  const recipeId = recipe?.id;
  const available = !!recipe && canExplain(recipe);
  const [guide, setGuide] = useState<RecipeGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId || !available) return;
    let cancelled = false;
    loadAll().then((all) => {
      if (!cancelled && all[recipeId]) setGuide(all[recipeId]);
    });
    return () => {
      cancelled = true;
    };
  }, [recipeId, available]);

  const request = useCallback(async () => {
    if (!recipeId) return;
    setLoading(true);
    setError(null);
    try {
      setGuide(await requestGuide(recipeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '설명을 만들지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  return { available, guide, loading, error, request };
}
