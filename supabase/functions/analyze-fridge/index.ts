// Supabase Edge Function: 냉장고 사진 → 재료 목록 (Gemini API)
//
// 배포:
//   npx supabase secrets set GEMINI_API_KEY=...
//   npx supabase functions deploy analyze-fridge
// 앱의 .env 에 EXPO_PUBLIC_ANALYZE_URL=https://<project>.supabase.co/functions/v1/analyze-fridge 설정
//
// GEMINI_MODEL 은 배포 시점에 사용 가능한 이미지 입력 지원 모델로 설정한다.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT = `이 사진은 냉장고 내부입니다. 요리에 쓸 수 있는 식재료만 찾아 주세요.
- 이름은 한국어 일반 명칭으로 (예: "계란", "대파", "양배추")
- 포장 때문에 확실하지 않으면 confidence를 낮게
- 음료, 소스병 라벨처럼 재료가 아닌 것은 제외
JSON으로만 답하세요: {"ingredients":[{"name":"계란","confidence":0.9}]}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL');
  if (!apiKey || !model) return json({ error: 'GEMINI_API_KEY / GEMINI_MODEL not set' }, 500);

  const { image, mimeType } = await req.json().catch(() => ({}));
  if (typeof image !== 'string' || !image) return json({ error: 'image (base64) required' }, 400);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inline_data: { mime_type: mimeType ?? 'image/jpeg', data: image } }, { text: PROMPT }],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) return json({ error: `Gemini error ${res.status}` }, 502);

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    const parsed = JSON.parse(text ?? '{}');
    return json({ ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [] });
  } catch {
    return json({ ingredients: [] });
  }
});
