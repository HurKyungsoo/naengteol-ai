// Supabase Edge Function: 공공 레시피의 AI 보충 설명 (Gemini API)
//
// 앱이 보낸 글이 아니라 DB의 원본 레시피를 직접 읽어 만들기 때문에, 이 함수로 임의의 질문을 할 수 없다.
// 한 번 만든 설명은 recipe_guides 테이블에 저장해 모든 사용자가 같이 쓴다.
// 설명 규칙과 생성 로직은 ../_shared/guide.ts
//
// secrets: GEMINI_API_KEY, APP_KEY(analyze-fridge와 같음), GEMINI_MODEL(선택)
// 자동 제공: SUPABASE_URL, SUPABASE_SECRET_KEYS

import { DEFAULT_MODEL, generateGuide, type SourceRecipe } from '../_shared/guide.ts';

const RATE_LIMIT = { windowMs: 60_000, max: 6 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // 2. 원본 레시피를 DB에서 읽어 생성한다
  const rows = await db(`recipes?id=eq.${recipeId}&select=title,ingredients,steps`).then((r) => r.json());
  const recipe = Array.isArray(rows) ? (rows[0] as SourceRecipe | undefined) : undefined;
  if (!recipe) return json({ error: 'recipe not found' }, 404);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'server not configured' }, 500);
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
  const result = await generateGuide(recipe, model, apiKey);
  if ('error' in result) return json({ error: result.error }, result.status);

  // 3. 저장해서 다음 요청부터는 바로 돌려준다
  const saved = await db('recipe_guides', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ recipe_id: recipeId, guide: result.guide, model }),
  });
  if (!saved.ok) console.error('save failed', saved.status, (await saved.text()).slice(0, 300));

  return json({ guide: result.guide, cached: false });
});
