import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { normalizeIngredient } from '@/lib/ingredients';
import type { Bought, CookLog, PantryItem, Preferences } from '@/types';

// Supabase로 옮기기 전까지는 기기에만 저장한다.
const STORAGE_KEY = 'naengteol/state/v1';

type Profile = {
  nickname: string;
  notifications: boolean;
};

type PersistedState = {
  pantry: PantryItem[];
  favorites: string[];
  cookLogs: CookLog[];
  recentViewed: string[];
  preferences: Preferences;
  profile: Profile;
  /** 처음 켰을 때의 소개(온보딩)를 봤는지 */
  onboarded: boolean;
};

const EMPTY_STATE: PersistedState = {
  pantry: [],
  favorites: [],
  cookLogs: [],
  recentViewed: [],
  preferences: { preferOwned: true },
  profile: { nickname: '냉털이', notifications: true },
  onboarded: false,
};

type AppStateValue = PersistedState & {
  loaded: boolean;
  /** 이미 있는 재료면 false를 돌려준다. bought를 안 주면 오늘 산 것으로 본다. */
  addIngredient: (name: string, amount?: string, bought?: Bought) => boolean;
  updateIngredient: (id: string, name: string, amount?: string) => void;
  /** undefined면 기본 보관 기간으로 되돌린다. */
  setExpiry: (id: string, expiresAt: number | undefined) => void;
  /** 산 날을 몰랐던 재료들의 산 날을 한꺼번에 정한다. */
  setBought: (ids: string[], daysAgo: number) => void;
  removeIngredient: (id: string) => void;
  clearPantry: () => void;
  toggleFavorite: (recipeId: string) => void;
  markViewed: (recipeId: string) => void;
  /** 요리 완료 기록을 남기고 사용한 재료를 냉장고에서 뺀다. */
  completeCooking: (recipeId: string, usedPantryIds: string[]) => void;
  setPreferences: (prefs: Preferences) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  completeOnboarding: () => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanAmount(amount?: string): string | undefined {
  const trimmed = amount?.trim();
  return trimmed ? trimmed : undefined;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        setState({
          ...EMPTY_STATE,
          ...saved,
          preferences: { ...EMPTY_STATE.preferences, ...saved.preferences },
          profile: { ...EMPTY_STATE.profile, ...saved.profile },
          // 온보딩이 생기기 전부터 쓰던 사람에게는 보여 주지 않는다.
          onboarded: saved.onboarded ?? true,
        });
      })
      .catch((e) => console.warn('저장된 데이터를 불러오지 못했습니다', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    // 불러오기 전에 빈 상태로 덮어쓰지 않도록 한다.
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('데이터를 저장하지 못했습니다', e),
    );
  }, [state, loaded]);

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      loaded,
      addIngredient: (name, amount, bought) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const key = normalizeIngredient(trimmed);
        if (state.pantry.some((p) => normalizeIngredient(p.name) === key)) return false;
        const now = Date.now();
        const item: PantryItem = { id: newId(), name: trimmed, amount: cleanAmount(amount), addedAt: now };
        if (bought === 'unknown') item.boughtUnknown = true;
        else if (bought && bought.daysAgo > 0) item.boughtAt = now - bought.daysAgo * 24 * 60 * 60 * 1000;
        setState((s) => {
          // 같은 렌더에서 여러 번 호출될 수 있으니 최신 상태로 한 번 더 확인한다.
          if (s.pantry.some((p) => normalizeIngredient(p.name) === key)) return s;
          return { ...s, pantry: [item, ...s.pantry] };
        });
        return true;
      },
      updateIngredient: (id, name, amount) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setState((s) => ({
          ...s,
          pantry: s.pantry.map((p) =>
            p.id === id ? { ...p, name: trimmed, amount: cleanAmount(amount) } : p,
          ),
        }));
      },
      setExpiry: (id, expiresAt) => {
        setState((s) => ({
          ...s,
          pantry: s.pantry.map((p) => (p.id === id ? { ...p, expiresAt } : p)),
        }));
      },
      setBought: (ids, daysAgo) => {
        const boughtAt = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
        setState((s) => ({
          ...s,
          pantry: s.pantry.map((p) => (ids.includes(p.id) ? { ...p, boughtAt, boughtUnknown: undefined } : p)),
        }));
      },
      removeIngredient: (id) => {
        setState((s) => ({ ...s, pantry: s.pantry.filter((p) => p.id !== id) }));
      },
      clearPantry: () => {
        setState((s) => ({ ...s, pantry: [] }));
      },
      toggleFavorite: (recipeId) => {
        setState((s) => ({
          ...s,
          favorites: s.favorites.includes(recipeId)
            ? s.favorites.filter((f) => f !== recipeId)
            : [recipeId, ...s.favorites],
        }));
      },
      markViewed: (recipeId) => {
        setState((s) =>
          s.recentViewed[0] === recipeId
            ? s
            : { ...s, recentViewed: [recipeId, ...s.recentViewed.filter((r) => r !== recipeId)].slice(0, 10) },
        );
      },
      completeCooking: (recipeId, usedPantryIds) => {
        setState((s) => {
          const used = s.pantry.filter((p) => usedPantryIds.includes(p.id));
          return {
            ...s,
            pantry: s.pantry.filter((p) => !usedPantryIds.includes(p.id)),
            cookLogs: [
              { recipeId, cookedAt: Date.now(), usedIngredients: used.map((p) => p.name) },
              ...s.cookLogs,
            ].slice(0, 50),
          };
        });
      },
      setPreferences: (preferences) => {
        setState((s) => ({ ...s, preferences }));
      },
      updateProfile: (profile) => {
        setState((s) => ({ ...s, profile: { ...s.profile, ...profile } }));
      },
      completeOnboarding: () => {
        setState((s) => ({ ...s, onboarded: true }));
      },
    }),
    [state, loaded],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState는 AppStateProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
