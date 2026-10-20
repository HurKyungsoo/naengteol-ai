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
  쇠고기: '소고기',
  브로컬리: '브로콜리',
  다진파: '대파',
  실파: '쪽파',
};

// 부족한 재료 대신 쓸 수 있는 재료. 키와 값 모두 정규화된 이름을 쓴다.
const SUBSTITUTES: Record<string, string[]> = {
  대파: ['쪽파', '양파'],
  양파: ['대파'],
  돼지고기: ['닭고기', '참치캔', '스팸'],
  닭가슴살: ['닭고기', '두부', '참치캔'],
  닭고기: ['닭가슴살', '돼지고기'],
  우유: ['두유'],
  버터: ['식용유'],
  설탕: ['올리고당', '꿀'],
  고추장: ['고춧가루'],
  애호박: ['주키니', '가지'],
  두부: ['계란'],
  양배추: ['배추', '양상추'],
  어묵: ['소시지', '스팸'],
  스팸: ['소시지', '햄'],
  소시지: ['스팸', '햄'],
  고추: ['고춧가루'],
  감자: ['고구마'],
  김치: ['깍두기'],
  밥: ['현미밥'],
  토마토: ['방울토마토'],
  방울토마토: ['토마토'],
  파프리카: ['피망', '당근'],
  피망: ['파프리카'],
  연어: ['참치캔', '닭가슴살'],
  양상추: ['양배추', '상추'],
  치즈: ['모짜렐라치즈'],
  빵: ['모닝빵', '또띠아'],
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

export function substitutesFor(name: string): string[] {
  return SUBSTITUTES[normalizeIngredient(name)] ?? [];
}
