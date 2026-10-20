/**
 * 공공 레시피의 참고 영상 (서버 함수 find-video, 유튜브 검색 결과).
 * 영상은 레시피 원본이 아니라 같은 요리의 참고 영상이라 화면에서 "참고 영상"으로 표시한다.
 *
 * - 영상 목록: 서버가 매일 미리 찾아 둔 recipe_videos 테이블을 한 번에 받아 하루 동안 기기에 저장한다.
 * - 목록에 없는 레시피는 상세 화면을 열 때 함수로 찾고, 결과(영상 없음 포함)를 7일 동안 기기에 저장한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { SUPABASE_KEY, SUPABASE_URL } from '@/config';
import type { Recipe } from '@/types';

export type RecipeVideo = { videoId: string; title: string; channel: string; durationS: number };
export type VideoIndex = Map<string, RecipeVideo>;

const INDEX_KEY = 'naengteol/video-index/v1';
const INDEX_TTL_MS = 24 * 60 * 60 * 1000;
const LOOKUP_KEY = 'naengteol/videos/v2';
const LOOKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;

type IndexRow = { recipe_id: string; video_id: string; title: string; channel: string; duration_s: number };

const toVideo = (r: IndexRow): RecipeVideo => ({
  videoId: r.video_id,
  title: r.title,
  channel: r.channel,
  durationS: r.duration_s,
});

// ── 영상 목록 ─────────────────────────────────────────────

let indexPromise: Promise<VideoIndex> | null = null;

async function fetchIndex(): Promise<IndexRow[]> {
  const rows: IndexRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/recipe_videos?video_id=not.is.null&select=recipe_id,video_id,title,channel,duration_s&order=recipe_id&limit=1000&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY } },
    );
    if (!res.ok) throw new Error(`영상 목록을 받지 못했습니다 (${res.status})`);
    const page = (await res.json()) as IndexRow[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function loadIndex(): Promise<VideoIndex> {
  let cached: { at: number; rows: IndexRow[] } | null = null;
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    cached = raw ? JSON.parse(raw) : null;
  } catch {
    cached = null;
  }
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return new Map(cached.rows.map((r) => [r.recipe_id, toVideo(r)]));
  try {
    const rows = await fetchIndex();
    AsyncStorage.setItem(INDEX_KEY, JSON.stringify({ at: Date.now(), rows })).catch(() => {});
    return new Map(rows.map((r) => [r.recipe_id, toVideo(r)]));
  } catch (e) {
    console.warn(e);
    // 인터넷이 안 되면 예전 목록이라도 쓴다.
    return new Map((cached?.rows ?? []).map((r) => [r.recipe_id, toVideo(r)]));
  }
}

/** 영상이 있는 레시피 목록 (레시피 id → 영상). 앱을 켜고 처음 쓸 때 한 번 받는다. */
export function useVideoIndex(): VideoIndex {
  const [index, setIndex] = useState<VideoIndex>(() => new Map());
  useEffect(() => {
    let cancelled = false;
    indexPromise ??= loadIndex();
    indexPromise.then((i) => {
      if (!cancelled) setIndex(i);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return index;
}

// ── 레시피 하나 찾기 ─────────────────────────────────────

type Lookup = { at: number; video: RecipeVideo | null };
let lookups: Record<string, Lookup> | null = null;

async function loadLookups(): Promise<Record<string, Lookup>> {
  if (lookups) return lookups;
  try {
    const raw = await AsyncStorage.getItem(LOOKUP_KEY);
    lookups = raw ? (JSON.parse(raw) as Record<string, Lookup>) : {};
  } catch {
    lookups = {};
  }
  return lookups;
}

async function saveLookup(recipeId: string, video: RecipeVideo | null) {
  const all = await loadLookups();
  all[recipeId] = { at: Date.now(), video };
  AsyncStorage.setItem(LOOKUP_KEY, JSON.stringify(all)).catch((e) => console.warn('영상 정보를 저장하지 못했습니다', e));
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
    await saveLookup(recipeId, video);
    return video;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function findVideo(recipeId: string): Promise<RecipeVideo | null | undefined> {
  indexPromise ??= loadIndex();
  const fromIndex = (await indexPromise).get(recipeId);
  if (fromIndex) return fromIndex;
  const saved = (await loadLookups())[recipeId];
  if (saved && Date.now() - saved.at < LOOKUP_TTL_MS) return saved.video;
  return requestVideo(recipeId);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const videoThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/** 참고 영상은 서버 DB에 원본이 있는 공공 레시피에만 찾는다. 화면을 열면 자동으로 찾고, 없으면 null. */
export function useRecipeVideo(recipe: Pick<Recipe, 'id' | 'source'> | undefined): RecipeVideo | null {
  const recipeId = recipe?.source === 'foodsafety' ? recipe.id : undefined;
  const [found, setFound] = useState<{ recipeId: string; video: RecipeVideo } | null>(null);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    findVideo(recipeId).then((video) => {
      if (!cancelled && video) setFound({ recipeId, video });
    });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  return found && found.recipeId === recipeId ? found.video : null;
}
