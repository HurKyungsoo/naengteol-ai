/**
 * 냉장고 사진에서 재료 후보를 찾는다.
 *
 * Gemini API 키를 앱에 넣지 않기 위해 Supabase Edge Function(supabase/functions/analyze-fridge)을 거쳐 호출한다.
 * 서버 주소는 src/config.ts 에 있고, 데모 모드(EXPO_PUBLIC_ANALYZE_URL=demo)면 데모 결과를 돌려준다.
 */

import { ANALYZE_URL, SUPABASE_KEY } from '@/config';

export type DetectedIngredient = {
  name: string;
  /** 0~1 */
  confidence: number;
};

export type AnalyzeResult = {
  items: DetectedIngredient[];
  demo: boolean;
};

const ENDPOINT = ANALYZE_URL;
/** Supabase publishable 키. 공개돼도 되는 키이며, 서버 함수가 APP_KEY와 비교해 앱의 요청인지 확인한다. */
const APP_KEY = SUPABASE_KEY;
// Gemini 응답이 느린 날은 한 장에 20~40초 걸리기도 해서 넉넉히 기다린다. 화면에는 기다리는 동안 안내를 보여 준다.
const TIMEOUT_MS = 60_000;

const ERROR_MESSAGES: Record<number, string> = {
  401: '사진 분석 서버 설정이 맞지 않아요.',
  413: '사진 용량이 너무 커요.',
  429: '잠시 후 다시 시도해 주세요. (요청이 너무 많아요)',
};

const DEMO_ITEMS: DetectedIngredient[] = [
  { name: '토마토', confidence: 0.96 },
  { name: '양파', confidence: 0.93 },
  { name: '파프리카', confidence: 0.9 },
  { name: '계란', confidence: 0.88 },
  { name: '양배추', confidence: 0.71 },
  { name: '우유', confidence: 0.58 },
];

/** 카메라·앨범이 돌려주는 base64에 data URL 머리말이 붙어 있으면 떼어 낸다. */
export function stripDataUrl(base64: string): string {
  const comma = base64.indexOf(',');
  return base64.startsWith('data:') && comma >= 0 ? base64.slice(comma + 1) : base64;
}

export async function analyzeFridgePhoto(base64: string, mimeType = 'image/jpeg'): Promise<AnalyzeResult> {
  if (!ENDPOINT) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { items: DEMO_ITEMS, demo: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(APP_KEY && { apikey: APP_KEY }) },
      body: JSON.stringify({ image: stripDataUrl(base64), mimeType }),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted ? '분석이 너무 오래 걸려요. 다시 시도해 주세요.' : '인터넷 연결을 확인해 주세요.',
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(ERROR_MESSAGES[res.status] ?? `사진 분석에 실패했어요. (${res.status})`);

  const data = (await res.json()) as { ingredients?: unknown };
  const items = Array.isArray(data.ingredients)
    ? data.ingredients.flatMap((item): DetectedIngredient[] => {
        const { name, confidence } = (item ?? {}) as Record<string, unknown>;
        return typeof name === 'string' && name.trim()
          ? [{ name: name.trim(), confidence: typeof confidence === 'number' ? confidence : 0.5 }]
          : [];
      })
    : [];
  return { items, demo: false };
}
