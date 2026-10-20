/**
 * 이 요리에 맞는 대체 재료인지 AI 확인 (서버 함수 check-substitutes).
 * 후보는 대체 재료 표에서 서버가 만들고, AI는 이 요리 기준으로 good/ok/bad만 매긴다.
 * 받은 결과는 기기에 저장해 다시 요청하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SUPABASE_KEY, SUPABASE_URL } from '@/config';
import type { Recipe } from '@/types';

export type SubstituteFit = 'good' | 'ok' | 'bad';
export type SubstituteCheckItem = {
  name: string;
  role: string;
  omit: { possible: boolean; note: string };
  candidates: { name: string; fit: SubstituteFit; note: string }[];
};

const CACHE_KEY = 'naengteol/substitute-checks/v1';
// 처음 만들 때 15~20초, 서버가 한 번 다시 시도하면 더 걸린다.
const TIMEOUT_MS = 50_000;

const ERROR_MESSAGES: Record<number, string> = {
  429: '요청이 많아요. 잠시 후 다시 눌러 주세요.',
  404: '이 레시피는 확인할 수 없어요.',
};

let memory: Record<string, SubstituteCheckItem[]> | null = null;

async function loadAll(): Promise<Record<string, SubstituteCheckItem[]>> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memory = raw ? (JSON.parse(raw) as Record<string, SubstituteCheckItem[]>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

async function save(recipeId: string, items: SubstituteCheckItem[]) {
  const all = await loadAll();
  all[recipeId] = items;
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all)).catch((e) => console.warn('확인 결과를 저장하지 못했습니다', e));
}

async function requestCheck(recipeId: string): Promise<SubstituteCheckItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/check-substitutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ recipeId }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(controller.signal.aborted ? '확인이 너무 오래 걸려요. 다시 눌러 주세요.' : '인터넷 연결을 확인해 주세요.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(ERROR_MESSAGES[res.status] ?? `확인하지 못했어요. (${res.status})`);
  const { items } = (await res.json()) as { items: SubstituteCheckItem[] };
  await save(recipeId, items);
  return items;
}

/** 서버 DB에 원본이 있는 공공 레시피만 확인할 수 있다. */
export function useSubstituteCheck(recipe: Pick<Recipe, 'id' | 'source'> | undefined) {
  const recipeId = recipe?.id;
  const available = recipe?.source === 'foodsafety';
  const [items, setItems] = useState<SubstituteCheckItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId || !available) return;
    let cancelled = false;
    loadAll().then((all) => {
      if (!cancelled && all[recipeId]) setItems(all[recipeId]);
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
      setItems(await requestCheck(recipeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '확인하지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  return { available, items, loading, error, request };
}
