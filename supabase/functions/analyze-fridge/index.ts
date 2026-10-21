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

// 앱은 confidence 0.7 이상만 미리 체크하고 나머지는 체크하지 않은 채 보여 준다.
// 그래서 애매한 재료도 낮은 confidence로 넉넉히 알려 주는 편이 좋다. 다만 높은 confidence로 잘못 말하면
// 냉장고에 없는 재료가 그대로 들어가므로, 확신이 없을 때 confidence를 낮추게 한다.
// 한국 냉장고는 재료가 대부분 반찬통·비닐봉지·장류 통에 들어 있어서 "보이는 것만"으로 좁히면 거의 못 찾는다.
const PROMPT = `이 사진은 냉장고 내부 또는 식재료 사진입니다. 요리에 쓸 수 있는 식재료와 양념을 최대한 많이 찾아 주세요.
- 이름은 한국 가정에서 흔히 쓰는 한국어 일반 명칭으로 (예: "계란", "대파", "상추", "김치", "된장", "고추장", "간장", "참기름", "케첩")
- 투명한 반찬통·밀폐용기·비닐봉지 안의 내용물도 색과 모양으로 알아볼 수 있으면 포함하세요 (예: 빨간 배추 → "김치", 봉지 속 초록 잎채소 → "상추", 하얀 알맹이 → "마늘")
- 장류·소스·양념(된장, 고추장, 간장, 참기름, 굴소스, 케첩, 마요네즈, 식초 등)도 포함하세요. 병 모양과 색으로 추정할 수 있어요
- confidence 기준: 0.9 이상 = 분명히 보이고 종류도 확실함 / 0.7~0.85 = 거의 확실함 / 0.4~0.65 = 그럴 것 같지만 가려졌거나 비슷한 다른 재료일 수 있음
- 색이나 모양만 비슷한 추측은 반드시 0.65 이하로 (예: 그릇 속 노란 조각을 바나나로 단정하지 않기)
- 종류가 애매한 슬라이스 고기는 "햄"처럼 넓은 이름으로
- 문 쪽 칸, 서랍, 뒤쪽까지 칸마다 살펴보세요
- 같은 재료는 한 번만
- 우유는 포함하고, 생수·주스·탄산음료·술 같은 마실 것과 그릇·용기 자체는 제외
- 소비기한이나 신선도는 판단하지 마세요`;

// 지시해도 음료를 넣을 때가 있어 한 번 더 거른다. 우유·두유는 요리에 쓰므로 남긴다.
const DRINK = /(주스|쥬스|음료|음료수|콜라|사이다|탄산수|커피|맥주|소주|와인|생수|이온음료)$/;
// 레시피와 맞춰 볼 수 없는 뭉뚱그린 이름
const VAGUE = new Set(['소스', '양념', '드레싱', '샐러드', '반찬', '음식', '채소', '야채', '과일', '견과류', '병', '통']);
// 가끔 모델이 깨진 글자(다른 문자 체계)를 돌려준다. 한글 이름만 받는다.
const HANGUL_NAME = /^[가-힣][가-힣0-9 ]*$/;

function usable(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  return HANGUL_NAME.test(n) && !DRINK.test(n) && !VAGUE.has(n);
}

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

  // 가끔 모델이 깨진 글자만 돌려줘 거르고 나면 빈 결과가 된다. 그때는 한 번만 다시 묻는다.
  for (let attempt = 1; ; attempt++) {
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
          // 재료 이름 목록만 뽑으면 되므로 길게 생각할 필요가 없다. 생각이 길어지면 30초를 넘기기도 했다.
          thinkingConfig: { thinkingLevel: 'minimal' },
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
    let ingredients: { name: string; confidence: number }[] = [];
    try {
      const parsed = JSON.parse(text ?? '{}');
      if (Array.isArray(parsed.ingredients)) ingredients = parsed.ingredients.filter((i: { name: unknown }) => usable(i.name));
    } catch {
      // 아래에서 빈 결과로 처리한다.
    }
    if (ingredients.length > 0 || attempt >= 2) return json({ ingredients });
    console.warn('empty result, retrying', (text ?? '').slice(0, 200));
  }
});
