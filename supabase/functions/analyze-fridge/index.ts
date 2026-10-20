// Supabase Edge Function: 냉장고 사진 → 재료 후보 목록 (Gemini API)
//
// 배포 방법은 README의 "사진 분석 (Gemini) 연결"을 참고한다.
// 필요한 secrets:
//   GEMINI_API_KEY   Google AI Studio에서 발급한 키 (앱에는 절대 넣지 않는다)
//   APP_KEY          앱이 apikey 헤더로 보내는 값. Supabase publishable 키를 그대로 쓴다.
//   GEMINI_MODEL     (선택) 기본값 gemini-3.5-flash-lite

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// 앱이 가로 1024px JPEG로 줄여 보내므로 보통 수백 KB다. 그보다 훨씬 크면 거절한다.
const MAX_BASE64_LENGTH = 2_800_000; // 약 2MB
// 한 인스턴스 기준의 간단한 호출 제한. 비용 폭주를 막기 위한 최소한의 장치다.
const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT = `이 사진은 냉장고 내부 또는 식재료 사진입니다. 요리에 쓸 수 있는 식재료만 찾아 주세요.
- 이름은 한국어 일반 명칭으로 (예: "계란", "대파", "양배추", "두부")
- 포장이나 가림 때문에 확실하지 않으면 confidence를 낮게 (0~1)
- 같은 재료는 한 번만
- 음료, 양념병 라벨, 그릇처럼 재료가 아닌 것은 제외
- 소비기한이나 신선도는 판단하지 마세요`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, confidence: { type: 'NUMBER' } },
        required: ['name', 'confidence'],
      },
    },
  },
  required: ['ingredients'],
};

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const appKey = Deno.env.get('APP_KEY');
  if (!appKey || req.headers.get('apikey') !== appKey) return json({ error: 'unauthorized' }, 401);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'too many requests' }, 429);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'server not configured' }, 500);
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

  const { image, mimeType } = await req.json().catch(() => ({}));
  if (typeof image !== 'string' || !image) return json({ error: 'image (base64) required' }, 400);
  if (image.length > MAX_BASE64_LENGTH) return json({ error: 'image too large' }, 413);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inline_data: { mime_type: mimeType ?? 'image/jpeg', data: image } }, { text: PROMPT }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });
  if (!res.ok) {
    // 원인 파악용으로 로그만 남기고, 앱에는 상세 내용을 보내지 않는다.
    console.error('gemini error', res.status, (await res.text()).slice(0, 500));
    return json({ error: `gemini error ${res.status}` }, 502);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    const parsed = JSON.parse(text ?? '{}');
    return json({ ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [] });
  } catch {
    return json({ ingredients: [] });
  }
});
