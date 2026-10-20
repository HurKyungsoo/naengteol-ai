import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { RECIPES as SAMPLE_RECIPES } from '@/data/recipes';
import { fetchRemoteRecipes, readCache, writeCache } from '@/lib/recipeSource';
import type { Recipe } from '@/types';

// 레시피는 자주 바뀌지 않으니 하루에 한 번만 새로 받는다.
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

type Status = 'loading' | 'ready' | 'error';

type RecipesValue = {
  /** 앱에 들어 있는 샘플 레시피 + 서버의 공공 레시피 */
  recipes: Recipe[];
  findRecipe: (id: string) => Recipe | undefined;
  status: Status;
  /** 공공 레시피 수 (0이면 아직 못 받음) */
  remoteCount: number;
  fetchedAt?: number;
  refresh: () => Promise<void>;
};

const RecipesContext = createContext<RecipesValue | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Recipe[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | undefined>();
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    try {
      const recipes = await fetchRemoteRecipes();
      const now = Date.now();
      setRemote(recipes);
      setFetchedAt(now);
      setStatus('ready');
      await writeCache({ fetchedAt: now, recipes });
    } catch (e) {
      console.warn(e);
      // 저장해 둔 레시피가 있으면 그대로 쓰고, 없으면 샘플 레시피만으로 동작한다.
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readCache().then((cache) => {
      if (cancelled) return;
      if (cache) {
        setRemote(cache.recipes);
        setFetchedAt(cache.fetchedAt);
        setStatus('ready');
      }
      if (!cache || Date.now() - cache.fetchedAt > REFRESH_AFTER_MS) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<RecipesValue>(() => {
    const recipes = [...SAMPLE_RECIPES, ...remote];
    const byId = new Map(recipes.map((r) => [r.id, r]));
    return {
      recipes,
      findRecipe: (id) => byId.get(id),
      status,
      remoteCount: remote.length,
      fetchedAt,
      refresh,
    };
  }, [remote, status, fetchedAt, refresh]);

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes는 RecipesProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
