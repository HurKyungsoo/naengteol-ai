/**
 * 공공 레시피의 참고 영상 (서버 함수 find-video, 유튜브 검색 결과).
 * 영상은 레시피 원본이 아니라 같은 요리의 참고 영상이라 화면에서 "참고 영상"으로 표시한다.
 * 받은 결과(영상 없음 포함)는 기기에 저장해 다시 요청하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { SUPABASE_KEY, SUPABASE_URL } from '@/config';
import type { Recipe } from '@/types';

export type RecipeVideo = { videoId: string; title: string; channel: string; durationS: number };

const CACHE_KEY = 'naengteol/videos/v1';
const TIMEOUT_MS = 15_000;

let memory: Record<string, RecipeVideo | null> | null = null;

async function loadAll(): Promise<Record<string, RecipeVideo | null>> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memory = raw ? (JSON.parse(raw) as Record<string, RecipeVideo | null>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

async function save(recipeId: string, video: RecipeVideo | null) {
  const all = await loadAll();
  all[recipeId] = video;
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all)).catch((e) => console.warn('영상 정보를 저장하지 못했습니다', e));
}

/** 실패(인터넷·할당량 초과 등)하면 undefined를 돌려주고 저장하지 않는다 → 다음에 다시 시도한다. */
async function requestVideo(recipeId: string): Promise<RecipeVideo | null | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/find-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ recipeId }),
      signal: controller.signal,
    });
    if (!res.ok) return undefined;
    const { video } = (await res.json()) as { video: RecipeVideo | null };
    await save(recipeId, video);
    return video;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 참고 영상은 서버 DB에 원본이 있는 공공 레시피에만 찾는다. 화면을 열면 자동으로 찾고, 없으면 null. */
export function useRecipeVideo(recipe: Pick<Recipe, 'id' | 'source'> | undefined): RecipeVideo | null {
  const recipeId = recipe?.source === 'foodsafety' ? recipe.id : undefined;
  const [found, setFound] = useState<{ recipeId: string; video: RecipeVideo | null } | null>(null);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    loadAll()
      .then((all) => (recipeId in all ? all[recipeId] : requestVideo(recipeId)))
      .then((video) => {
        if (!cancelled && video) setFound({ recipeId, video });
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  return found && found.recipeId === recipeId ? found.video : null;
}
