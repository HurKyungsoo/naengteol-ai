// Supabase Edge Function: 공공 레시피의 AI 보충 설명 (Gemini API)
//
// 원본 레시피는 바꾸지 않는다 (식품안전나라 약관: 위조·변조 금지). 원본 아래에 덧붙일 보충 설명만 만든다.
// 앱이 보낸 글이 아니라 DB의 원본 레시피를 직접 읽어 만들기 때문에, 이 함수로 임의의 질문을 할 수 없다.
// 한 번 만든 설명은 recipe_guides 테이블에 저장해 모든 사용자가 같이 쓴다.
//
// secrets: GEMINI_API_KEY, APP_KEY(analyze-fridge와 같음), GEMINI_MODEL(선택)
// 자동 제공: SUPABASE_URL, SUPABASE_SECRET_KEYS

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const RATE_LIMIT = { windowMs: 60_000, max: 6 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RULES = `당신은 요리 초보자를 돕는 요리 선생님입니다. 아래 원본 레시피에 덧붙일 "보충 설명"을 만드세요.
반드시 지킬 규칙:
- 원본의 재료, 분량, 단계 순서를 바꾸거나 새 재료를 추가하지 마세요. 원본을 더 이해하기 쉽게 풀어 주기만 합니다.
- 각 단계마다 2~3개의 짧은 팁: 불 세기, 시간 기준, 다 됐는지 확인하는 방법, 초보자가 자주 하는 실수 중 필요한 것.
- 원본에 없는 숫자(시간, 온도)는 "약"을 붙이고 일반적인 범위로만 말하세요.
- 고기·해산물·달걀은 충분히 익히라는 등 위생과 안전 주의가 필요하면 cautions에 넣으세요.
- 건강·질병·다이어트 효과나 "영양 만점", "몸에 좋은" 같은 표현은 쓰지 마세요. 맛과 만드는 법만 이야기하세요.
- 친근한 존댓말("~해요", "~하세요"), 한 문장은 짧게.
- steps 배열은 원본 단계 수와 같은 개수로, index는 1부터.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overview: { type: 'STRING', description: '요리 전체 흐름을 1~2문장으로' },
    prep: { type: 'ARRAY', items: { type: 'STRING' }, description: '시작 전 준비: 재료 손질 순서, 필요한 도구 (2~5개)' },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { index: { type: 'INTEGER' }, tips: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['index', 'tips'],
      },
    },
    cautions: { type: 'ARRAY', items: { type: 'STRING' }, description: '위생·안전 주의 (없으면 빈 배열)' },
  },
  required: ['overview', 'prep', 'steps', 'cautions'],
};

type Ingredient = { name: string; amount: string };
type Step = { text: string };
type Guide = { overview: string; prep: string[]; steps: { index: number; tips: string[] }[]; cautions: string[] };

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

const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '').slice(0, max) : [];

/** 모델 응답을 믿지 않고 형식을 다시 맞춘다. */
function sanitize(raw: unknown, stepCount: number): Guide | null {
  const g = (raw ?? {}) as Record<string, unknown>;
  if (typeof g.overview !== 'string') return null;
  const byIndex = new Map<number, string[]>();
  for (const s of Array.isArray(g.steps) ? g.steps : []) {
    const { index, tips } = (s ?? {}) as Record<string, unknown>;
    if (typeof index === 'number' && index >= 1 && index <= stepCount) byIndex.set(index, strings(tips, 4));
  }
  return {
    overview: g.overview.trim(),
    prep: strings(g.prep, 6),
    steps: Array.from({ length: stepCount }, (_, i) => ({ index: i + 1, tips: byIndex.get(i + 1) ?? [] })),
    cautions: strings(g.cautions, 4),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const appKey = Deno.env.get('APP_KEY');
  if (!appKey || req.headers.get('apikey') !== appKey) return json({ error: 'unauthorized' }, 401);

  const { recipeId } = await req.json().catch(() => ({}));
  if (typeof recipeId !== 'string' || !/^fs-\d+$/.test(recipeId)) return json({ error: 'recipeId required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const secretKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default as string | undefined;
  if (!secretKey) return json({ error: 'server not configured' }, 500);
  const db = (path: string, init?: RequestInit) =>
    fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: secretKey, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });

  // 1. 이미 만든 설명이 있으면 그대로 돌려준다 (비용 없음)
  const cached = await db(`recipe_guides?recipe_id=eq.${recipeId}&select=guide`).then((r) => r.json());
  if (Array.isArray(cached) && cached[0]?.guide) return json({ guide: cached[0].guide, cached: true });

  // 새로 만드는 경우에만 호출 제한을 건다.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'too many requests' }, 429);

  // 2. 원본 레시피를 DB에서 읽는다
  const rows = await db(`recipes?id=eq.${recipeId}&select=title,ingredients,steps`).then((r) => r.json());
  const recipe = Array.isArray(rows) ? rows[0] : undefined;
  if (!recipe) return json({ error: 'recipe not found' }, 404);
  const steps = recipe.steps as Step[];

  const original = [
    `요리: ${recipe.title}`,
    `재료: ${(recipe.ingredients as Ingredient[]).map((i) => `${i.name} ${i.amount}`).join(', ')}`,
    '단계:',
    ...steps.map((s, i) => `${i + 1}. ${s.text}`),
  ].join('\n');

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'server not configured' }, 500);
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ parts: [{ text: `원본 레시피:\n${original}` }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    console.error('gemini error', res.status, (await res.text()).slice(0, 500));
    return json({ error: `gemini error ${res.status}` }, 502);
  }

  const data = await res.json();
  let guide: Guide | null = null;
  try {
    guide = sanitize(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'), steps.length);
  } catch {
    guide = null;
  }
  if (!guide) return json({ error: 'could not generate' }, 502);

  // 3. 저장해서 다음 요청부터는 바로 돌려준다
  const saved = await db('recipe_guides', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ recipe_id: recipeId, guide, model }),
  });
  if (!saved.ok) console.error('save failed', saved.status, (await saved.text()).slice(0, 300));

  return json({ guide, cached: false });
});
