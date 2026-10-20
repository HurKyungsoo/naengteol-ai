/**
 * 냉장고 사진에서 재료 후보를 찾는다.
 *
 * Gemini API 키를 앱에 넣지 않기 위해 Supabase Edge Function(supabase/functions/analyze-fridge)을 거쳐 호출한다.
 * EXPO_PUBLIC_ANALYZE_URL 이 없으면 데모 결과를 돌려주고, 화면에서 데모임을 표시한다.
 */

export type DetectedIngredient = {
  name: string;
  /** 0~1 */
  confidence: number;
};

export type AnalyzeResult = {
  items: DetectedIngredient[];
  demo: boolean;
};

const ENDPOINT = process.env.EXPO_PUBLIC_ANALYZE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON_KEY && { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY }),
    },
    body: JSON.stringify({ image: stripDataUrl(base64), mimeType }),
  });
  if (!res.ok) throw new Error(`사진 분석 서버 오류 (${res.status})`);

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
