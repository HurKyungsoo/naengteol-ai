// AI 보충 설명 생성 (explain-recipe, explain-eval 공통)
//
// 원본 레시피는 바꾸지 않는다 (식품안전나라 약관: 위조·변조 금지). 원본 아래에 덧붙일 보충 설명만 만든다.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export const RULES = `당신은 요리 초보자를 돕는 요리 선생님입니다. 아래 원본 레시피에 덧붙일 "보충 설명"을 만드세요.
반드시 지킬 규칙:
- 원본의 재료, 분량, 단계 순서를 바꾸거나 새 재료를 추가하지 마세요. 원본을 더 이해하기 쉽게 풀어 주기만 합니다.
- 각 단계의 팁은 그 단계에서 원본이 하는 일만 설명하세요. 다른 단계의 재료를 미리 넣거나 원본에 없는 동작(예: 마지막에 참기름 두르기)을 더하지 마세요.
- 각 단계마다 2~3개의 짧은 팁. 그 단계에 실제로 도움이 되는 것만 고르세요: 손질 요령, 다 됐는지 눈으로 확인하는 방법, 초보자가 자주 하는 실수.
- 불 세기와 시간은 굽기·볶기·끓이기·찌기·튀기기·데치기·불리기·재우기처럼 익히거나 기다리는 단계에서만 말하세요. 썰기, 섞기, 갈기, 담기에는 불이나 시간을 쓰지 마세요.
- 숫자는 아라비아 숫자로 쓰세요(예: 3분, 170℃). 원본에 없는 숫자는 앞에 "약"을 붙이고 일반적인 범위로만 말하세요. 불 세기는 "약불", "중불", "센 불"로만 쓰고 "약 중불"처럼 쓰지 마세요.
- 익힘 안전: 닭고기·돼지고기·다진 고기·해산물·달걀은 속까지 완전히 익히라고 안내하세요. 덩어리 소고기 스테이크에는 "완전히 익히라"고 하지 말고 "원하는 굽기로" 익히면 된다고만 하세요.
- 이 규칙 자체나 "~단계이므로" 같은 설명은 쓰지 말고, 요리 팁만 쓰세요.
- 날로 먹는 재료(회, 연어 초밥 등)는 신선도와 냉장 보관을 cautions에 넣으세요.
- 건강·질병·다이어트 효과나 "영양 만점", "몸에 좋은" 같은 표현은 쓰지 마세요. 맛과 만드는 법만 이야기하세요.
- 친근한 존댓말("~해요", "~하세요"), 한 문장은 짧게. 맞춤법과 띄어쓰기를 지키고, 끝까지 완성된 문장으로 쓰세요.
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

export type SourceRecipe = {
  title: string;
  ingredients: { name: string; amount: string }[];
  steps: { text: string }[];
};

export type Guide = {
  overview: string;
  prep: string[];
  steps: { index: number; tips: string[] }[];
  cautions: string[];
};

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

export async function generateGuide(
  recipe: SourceRecipe,
  model: string,
  apiKey: string,
): Promise<{ guide: Guide } | { error: string; status: number }> {
  const original = [
    `요리: ${recipe.title}`,
    `재료: ${recipe.ingredients.map((i) => `${i.name} ${i.amount}`).join(', ')}`,
    '단계:',
    ...recipe.steps.map((s, i) => `${i + 1}. ${s.text}`),
  ].join('\n');

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
    console.error('gemini error', model, res.status, (await res.text()).slice(0, 500));
    return { error: `gemini error ${res.status}`, status: 502 };
  }

  const data = await res.json();
  try {
    const guide = sanitize(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'), recipe.steps.length);
    return guide ? { guide } : { error: 'could not generate', status: 502 };
  } catch {
    return { error: 'could not generate', status: 502 };
  }
}
