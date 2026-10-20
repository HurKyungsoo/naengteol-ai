// 재료 이름 정규화와 대체 재료 표.
// 앱(src/lib/ingredients.ts)과 서버 함수(check-substitutes)가 같이 쓰므로 다른 파일을 import하지 않는다.

// 같은 재료를 다르게 부르는 경우를 하나의 이름으로 맞춘다.
const ALIASES: Record<string, string> = {
  달걀: '계란',
  파: '대파',
  돼지고기앞다리: '돼지고기',
  돼지고기목살: '돼지고기',
  삼겹살: '돼지고기',
  참치: '참치캔',
  공기밥: '밥',
  즉석밥: '밥',
  햇반: '밥',
  배추김치: '김치',
  신김치: '김치',
  포기김치: '김치',
  청양고추: '고추',
  풋고추: '고추',
  마요: '마요네즈',
  식빵: '빵',
  훈제연어: '연어',
  체다치즈: '치즈',
  슬라이스치즈: '치즈',
  피자치즈: '모짜렐라치즈',
  양송이: '양송이버섯',
  다진양파: '양파',
  붉은고추: '홍고추',
  레몬주스: '레몬즙',
  플레인요거트: '요거트',
  검은깨: '흑임자',
  쇠고기: '소고기',
  브로컬리: '브로콜리',
  다진파: '대파',
  실파: '쪽파',
};

// 서로 바꿔 쓸 수 있는 재료 묶음. 같은 묶음 안의 재료는 서로의 대체 재료가 된다.
const SUBSTITUTE_GROUPS: string[][] = [
  ['표고버섯', '새송이버섯', '양송이버섯', '느타리버섯', '팽이버섯', '버섯'],
  ['홍고추', '청고추', '고추'],
  ['파프리카', '피망'],
  ['토마토', '방울토마토'],
  ['전분', '녹말가루', '감자전분'],
  ['양상추', '상추', '어린잎채소', '어린잎', '치커리', '새싹채소'],
  ['콩나물', '숙주'],
  ['미나리', '쑥갓', '참나물'],
  ['연두부', '순두부'],
  ['호두', '아몬드', '잣', '땅콩', '캐슈넛', '견과류'],
  ['흑임자', '참깨', '깨'],
  ['로즈마리', '타임'],
  ['파슬리', '파슬리가루'],
  ['바지락', '모시조개', '홍합', '조개'],
  ['오징어', '주꾸미', '낙지'],
  ['베이컨', '햄'],
  ['스팸', '소시지', '햄'],
  ['브로콜리', '콜리플라워'],
  ['사과', '배'],
  ['건포도', '크랜베리'],
  ['떡볶이떡', '가래떡'],
  ['판젤라틴', '가루젤라틴'],
];

// 한쪽으로만 바꿔 쓸 수 있는 재료 (예: 박력분 대신 중력분은 되지만, 반대로는 빵이 잘 안 된다).
// 키와 값 모두 정규화된 이름을 쓴다.
const SUBSTITUTES: Record<string, string[]> = {
  대파: ['쪽파', '양파'],
  쪽파: ['대파', '부추'],
  부추: ['쪽파'],
  양파: ['대파'],
  돼지고기: ['닭고기', '참치캔', '스팸'],
  다진돼지고기: ['다진소고기'],
  다진소고기: ['다진돼지고기'],
  소고기: ['돼지고기'],
  닭가슴살: ['닭고기', '두부', '참치캔'],
  닭고기: ['닭가슴살', '돼지고기'],
  새우: ['칵테일새우', '오징어'],
  연어: ['참치캔', '닭가슴살'],
  우유: ['두유'],
  두유: ['우유'],
  생크림: ['우유'],
  요거트: ['우유'],
  버터: ['식용유'],
  설탕: ['올리고당', '꿀'],
  꿀: ['올리고당', '설탕'],
  올리고당: ['꿀', '물엿'],
  물엿: ['올리고당'],
  고추장: ['고춧가루'],
  애호박: ['주키니', '가지'],
  가지: ['애호박'],
  두부: ['연두부', '계란'],
  양배추: ['배추', '양상추'],
  배추: ['알배추', '양배추'],
  알배추: ['배추'],
  시금치: ['청경채'],
  청경채: ['시금치', '알배추'],
  어묵: ['소시지', '스팸'],
  감자: ['고구마'],
  고구마: ['감자', '단호박'],
  단호박: ['고구마'],
  당근: ['파프리카'],
  김치: ['깍두기'],
  밥: ['현미밥'],
  현미: ['쌀'],
  치즈: ['모짜렐라치즈'],
  모짜렐라치즈: ['치즈'],
  빵: ['모닝빵', '또띠아'],
  밀가루: ['중력분', '부침가루'],
  중력분: ['밀가루'],
  박력분: ['중력분', '밀가루'],
  강력분: ['중력분'],
  부침가루: ['밀가루', '튀김가루'],
  튀김가루: ['부침가루', '밀가루'],
  찹쌀가루: ['쌀가루'],
  레몬즙: ['레몬', '식초'],
  레몬: ['레몬즙'],
  생강: ['생강가루', '생강즙'],
  다시마: ['멸치'],
  닭육수: ['육수', '치킨스톡'],
  화이트와인: ['청주', '맛술'],
  정종: ['청주', '맛술'],
  케첩: ['토마토소스'],
  굴소스: ['간장'],
  마요네즈: ['요거트'],
  블루베리: ['딸기'],
  무순: ['새싹채소'],
  튀김기름: ['식용유'],
  통후추: ['후추'],
  오렌지: ['귤'],
  달걀흰자: ['계란'],
};

export function normalizeIngredient(name: string): string {
  const compact = name.trim().replace(/\s+/g, '');
  return ALIASES[compact] ?? compact;
}

/**
 * 냉장고에 이 재료가 있는지. 이름이 같거나, 수식어가 앞에 붙은 경우(연두부 → 두부, 칵테일새우 → 새우)도 같은 재료로 본다.
 * 뒤에 붙는 경우(고추 → 고추장)는 다른 재료라서 보지 않고, 한 글자 재료(파)는 오인이 많아 정확히 같을 때만 본다.
 */
export function hasIngredient(owned: Set<string>, name: string): boolean {
  const key = normalizeIngredient(name);
  if (owned.has(key)) return true;
  for (const o of owned) {
    if (o.length >= 2 && key.length > o.length && key.endsWith(o)) return true;
  }
  return false;
}

const SUBSTITUTE_KEYS = new Set([...Object.keys(SUBSTITUTES), ...SUBSTITUTE_GROUPS.flat()]);
// 긴 이름부터 비교해야 "새송이버섯"이 "버섯"보다 먼저 맞는다.
const SUBSTITUTE_KEYS_BY_LENGTH = [...SUBSTITUTE_KEYS].sort((a, b) => b.length - a.length);

function substitutesOf(key: string): string[] {
  const fromGroups = SUBSTITUTE_GROUPS.filter((g) => g.includes(key)).flat();
  return [...(SUBSTITUTES[key] ?? []), ...fromGroups];
}

/**
 * 이 재료 대신 쓸 수 있는 재료 (최대 4개). 요리와 상관없는 일반적인 대체 재료다.
 * 표에 없는 이름은 뒤쪽이 같은 재료로 찾고, 그 재료 자체도 대체 재료로 넣는다
 * (건표고버섯 → 표고버섯·새송이버섯…, 칵테일새우 → 새우·오징어).
 */
export function substitutesFor(name: string): string[] {
  const key = normalizeIngredient(name);
  const base = SUBSTITUTE_KEYS.has(key)
    ? key
    : SUBSTITUTE_KEYS_BY_LENGTH.find((k) => k.length >= 2 && key.endsWith(k));
  if (!base) return [];
  return [...new Set([base, ...substitutesOf(base)])].filter((s) => s !== key).slice(0, 4);
}

// 요리 이름에서 짧은 재료 이름과 겹치는 낱말 ("배추"의 "배", "무침"의 "무", "고추장"의 "고추")
const TITLE_WORDS = [
  '배추', '알배추', '김치', '김말이', '무침', '무말랭이', '무순', '파스타', '파프리카', '파이', '파인애플', '파슬리',
  '굴소스', '고추장', '고춧가루', '고추기름', '콩나물', '콩국', '깨소금', '밤양갱', '마늘종', '마요',
];

/**
 * 이 재료가 요리 이름에 들어간 주재료인지 (배숙의 배, 단호박죽의 단호박, 두부조림의 두부).
 * 주재료를 바꾸면 다른 요리가 되기 쉬워서 화면에 주의를 띄우고, 추천 점수에서도 대체로 쳐 주지 않는다.
 * 더 긴 다른 낱말의 일부("고추장찌개"의 고추, "오이무침"의 무)는 빼고 본다.
 */
export function isMainIngredient(title: string, name: string, otherNames: string[] = []): boolean {
  const compact = (s: string) => s.replace(/\s+/g, '');
  const names = [...new Set([compact(name), normalizeIngredient(name)])].filter(Boolean);
  let t = compact(title.replace(/\(.*?\)|\[.*?\]/g, ' '));
  const longer = [...TITLE_WORDS, ...otherNames.map(compact)]
    .filter((w) => names.some((n) => w.length > n.length && w.includes(n)))
    .sort((a, b) => b.length - a.length);
  for (const w of longer) t = t.split(w).join('|');
  return names.some((n) => t.includes(n));
}
