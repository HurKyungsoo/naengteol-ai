// Supabase Edge Function: 이 요리에 맞는 대체 재료인지 AI로 확인 (Gemini API)
//
// 대체 재료 후보는 앱과 같은 표(../_shared/ingredients.ts)에서 서버가 직접 만들고, AI는 그 후보를
// 이 요리 기준으로 평가만 한다 (새 재료를 지어내지 않게). 레시피도 DB의 원본을 읽는다.
// 한 번 만든 결과는 recipe_substitutes 테이블에 저장해 모든 사용자가 같이 쓴다.
//
// secrets: GEMINI_API_KEY, APP_KEY(analyze-fridge와 같음), GEMINI_MODEL(선택)
// 자동 제공: SUPABASE_URL, SUPABASE_SECRET_KEYS

import { DEFAULT_MODEL } from '../_shared/guide.ts';
import { isMainIngredient, substitutesFor } from '../_shared/ingredients.ts';

const RATE_LIMIT = { windowMs: 60_000, max: 6 };
const MAX_ITEMS = 15;

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

const RULES = `당신은 요리 선생님입니다. 아래 레시피에서 각 재료가 없을 때, 주어진 대체 후보가 "이 요리에" 맞는지 평가하세요.
반드시 지킬 규칙:
- 후보 목록에 있는 재료만 평가하세요. 목록에 없는 재료를 새로 권하지 마세요.
- role: 그 재료가 이 요리에서 하는 역할을 10자 안팎으로 (예: "양념의 단맛", "국물의 시원한 맛", "요리의 주재료", "색감과 아삭함").
- fit: good = 이 요리에서 맛·식감이 거의 같음, ok = 맛이 조금 달라지지만 만들 수 있음, bad = 이 요리에는 맞지 않음.
- 요리 이름에 들어간 주재료(예: 배숙의 배, 단호박죽의 단호박)를 다른 재료로 바꾸면 다른 요리가 되므로 대부분 bad로 하세요.
- note: 바꿔 쓸 때 알아야 할 것 한 문장 (양 조절, 손질 차이, 익히는 시간 차이). bad면 왜 안 맞는지 짧게.
  고기·해산물로 바꿀 때 익히는 시간이 다르면 "속까지 익히세요"를 넣으세요.
- omit.possible: 이 재료를 빼도 요리가 된다면 true, omit.note에 빼면 어떻게 달라지는지 한 문장. 주재료는 false.
- 건강·다이어트 효과는 말하지 말고 맛과 만드는 법만 이야기하세요.
- 친근한 존댓말("~해요"), 짧고 완성된 문장. 숫자는 아라비아 숫자로.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          role: { type: 'STRING' },
          omit: {
            type: 'OBJECT',
            properties: { possible: { type: 'BOOLEAN' }, note: { type: 'STRING' } },
            required: ['possible', 'note'],
          },
          candidates: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                fit: { type: 'STRING', enum: ['good', 'ok', 'bad'] },
                note: { type: 'STRING' },
              },
              required: ['name', 'fit', 'note'],
            },
          },
        },
        required: ['name', 'role', 'omit', 'candidates'],
      },
    },
  },
  required: ['items'],
};

type Fit = 'good' | 'ok' | 'bad';
type CheckItem = {
  name: string;
  role: string;
  omit: { possible: boolean; note: string };
  candidates: { name: string; fit: Fit; note: string }[];
};

type SourceRecipe = {
  title: string;
  ingredients: { name: string; amount: string; seasoning?: boolean; optional?: boolean }[];
  steps: { text: string }[];
};

const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** 모델 응답을 믿지 않고, 보낸 재료·후보 이름만 남긴다. */
function sanitize(raw: unknown, asked: Map<string, string[]>): CheckItem[] {
  const items = ((raw ?? {}) as { items?: unknown }).items;
  const out: CheckItem[] = [];
  for (const it of Array.isArray(items) ? items : []) {
    const r = (it ?? {}) as Record<string, unknown>;
    const name = text(r.name, 40);
    const allowed = asked.get(name);
    if (!allowed || out.some((o) => o.name === name)) continue;
    const omit = (r.omit ?? {}) as Record<string, unknown>;
    const candidates = (Array.isArray(r.candidates) ? r.candidates : [])
      .map((c) => (c ?? {}) as Record<string, unknown>)
      .filter((c) => allowed.includes(text(c.name, 40)) && ['good', 'ok', 'bad'].includes(c.fit as string))
      .map((c) => ({ name: text(c.name, 40), fit: c.fit as Fit, note: text(c.note) }));
    out.push({
      name,
      role: text(r.role, 30),
      omit: { possible: omit.possible === true, note: text(omit.note) },
      candidates: [...new Map(candidates.map((c) => [c.name, c])).values()],
    });
  }
  return out;
}

async function generate(recipe: SourceRecipe, model: string, apiKey: string) {
  const core = recipe.ingredients.filter((i) => !i.seasoning).slice(0, MAX_ITEMS);
  const names = recipe.ingredients.map((i) => i.name);
  const asked = new Map(core.map((i) => [i.name, substitutesFor(i.name)]));

  const prompt = [
    `요리: ${recipe.title}`,
    `재료: ${recipe.ingredients.map((i) => `${i.name} ${i.amount}`).join(', ')}`,
    '단계:',
    ...recipe.steps.map((s, i) => `${i + 1}. ${s.text}`),
    '',
    '평가할 재료와 대체 후보 (후보가 없으면 빼도 되는지만 판단):',
    ...core.map((i) => {
      const main = isMainIngredient(recipe.title, i.name, names) ? ' [요리 이름에 들어간 주재료]' : '';
      const opt = i.optional ? ' [선택 재료]' : '';
      return `- ${i.name}${main}${opt}: ${asked.get(i.name)!.join(', ') || '(후보 없음)'}`;
    }),
  ].join('\n');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    console.error('gemini error', model, res.status, (await res.text()).slice(0, 500));
    return null;
  }
  const data = await res.json();
  try {
    const items = sanitize(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'), asked);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
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

  // 1. 이미 만든 결과가 있으면 그대로 돌려준다 (비용 없음)
  const cached = await db(`recipe_substitutes?recipe_id=eq.${recipeId}&select=items`).then((r) => r.json());
  if (Array.isArray(cached) && cached[0]?.items) return json({ items: cached[0].items, cached: true });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'too many requests' }, 429);

  // 2. 원본 레시피를 DB에서 읽어 평가한다
  const rows = await db(`recipes?id=eq.${recipeId}&select=title,ingredients,steps`).then((r) => r.json());
  const recipe = Array.isArray(rows) ? (rows[0] as SourceRecipe | undefined) : undefined;
  if (!recipe) return json({ error: 'recipe not found' }, 404);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'server not configured' }, 500);
  const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
  // 모델이 가끔 형식에 맞지 않는 답을 주므로 한 번 더 시도한다.
  const items = (await generate(recipe, model, apiKey)) ?? (await generate(recipe, model, apiKey));
  if (!items) return json({ error: 'could not generate' }, 502);

  // 3. 저장해서 다음 요청부터는 바로 돌려준다
  const saved = await db('recipe_substitutes', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ recipe_id: recipeId, items, model }),
  });
  if (!saved.ok) console.error('save failed', saved.status, (await saved.text()).slice(0, 300));

  return json({ items, cached: false });
});
