// 식품안전나라 "조리식품의 레시피 DB"(COOKRCP01)를 받아 Supabase recipes 테이블에 넣는다.
//
//   node scripts/import-recipes.mjs            # 받아서 scripts/out/recipes.json 과 통계만 만든다
//   node scripts/import-recipes.mjs --apply    # 위 + SQL을 만들어 Supabase(linked)에 적용
//
// 필요: .env 의 FOODSAFETY_API_KEY (앱에 들어가지 않도록 EXPO_PUBLIC_ 을 붙이지 않는다),
//       --apply 시 `npx supabase login` + `npx supabase link` 가 되어 있어야 한다.
//
// 출처 표시 조건으로 자유이용이 허락된 데이터다 (공공데이터활용 이용약관 제10조).
// 레시피 내용은 바꾸지 않고 형식만 정리한다. 원본에 없는 조리 시간·난이도는 추정값으로 표시한다.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'out');
const APPLY = process.argv.includes('--apply');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'qxzeuxidlotgzbhcqugj';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^\w+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  );
}

// ─── 1. 받기 ────────────────────────────────────────────────────────────────

async function fetchAll(key) {
  const rows = [];
  // 한 번에 최대 1000건 (API 제한)
  for (let start = 1; ; start += 1000) {
    const url = `https://openapi.foodsafetykorea.go.kr/api/${key}/COOKRCP01/json/${start}/${start + 999}`;
    const res = await fetch(url);
    const data = await res.json();
    const body = data.COOKRCP01;
    if (!body) throw new Error(`API 오류: ${JSON.stringify(data).slice(0, 200)}`);
    if (body.RESULT?.CODE !== 'INFO-000') {
      if (body.RESULT?.CODE === 'INFO-200') break; // 해당하는 데이터 없음
      throw new Error(`API 오류: ${body.RESULT?.CODE} ${body.RESULT?.MSG}`);
    }
    rows.push(...body.row);
    console.log(`  ${start}~ : ${body.row.length}건 (전체 ${body.total_count})`);
    if (rows.length >= Number(body.total_count)) break;
  }
  return rows;
}

// ─── 2. 변환 ────────────────────────────────────────────────────────────────

// 대부분 집에 있다고 보는 양념. 추천 점수에서 빠진다.
const SEASONINGS = new Set(
  (
    '소금 굵은소금 꽃소금 설탕 흑설탕 간장 진간장 국간장 양조간장 저염간장 참기름 들기름 식초 사과식초 현미식초 ' +
    '후추 후춧가루 후추가루 흰후추 물 식용유 포도씨유 카놀라유 올리브유 올리브오일 해바라기유 깨 통깨 참깨 깨소금 ' +
    '다진마늘 마늘 다진생강 생강즙 고춧가루 맛술 미림 청주 올리고당 물엿 조청 매실액 매실청 소금물 ' +
    '저염간장 저염소금 흰설탕 황설탕 갈색설탕 굵은고춧가루 고운고춧가루'
  ).split(' '),
);
const PRICEY = /소고기|쇠고기|한우|등심|안심|갈비|새우|전복|연어|장어|낙지|문어|대게|랍스터|관자|가리비|굴비|장어/;
const WESTERN = /파스타|스파게티|샐러드|스테이크|리조또|수프|스프|샌드위치|토스트|피자|그라탕|오믈렛|브루스케타|부리또|타코|카나페|라따뚜이|크로켓|퀘사디아/;
const CHINESE = /짜장|짬뽕|탕수|마파|깐풍|양장피|춘권|딤섬|팔보채|유린기|동파육/;

const compact = (s) => s.replace(/\s+/g, '');
const https = (u) => (u ? u.trim().replace(/^http:\/\//, 'https://') : undefined);

/** 괄호 안의 쉼표는 무시하고 쉼표로 나눈다. "두부 75g(3/4모), 새우 20g(5마리)" */
function splitItems(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === '，') && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function contextOf(header) {
  if (/양념|소스|드레싱|장$|국물|육수|시럽|반죽물/.test(header)) return 'seasoning';
  if (/고명|장식|토핑|가니쉬/.test(header)) return 'optional';
  return 'main';
}

function parseItem(part, ctx) {
  const cleaned = part.replace(/^[•·\-*●○]\s*/, '').trim();
  // 이름 = 첫 숫자 / "약간" / "적당량" / 괄호 앞까지, 분량 = 나머지
  const m = cleaned.match(/^(.+?)\s*((?:약\s*)?[\d½¼¾⅓⅔]+.*|약간.*|적당량.*|적당히.*|조금.*|소량.*|\(.*)$/);
  let name = (m ? m[1] : cleaned)
    .replace(/<[^>]*>/g, '') // 원본에 섞인 <br>
    .replace(/\[[^\]]*\]/g, '') // [양념]
    .replace(/\(.*?\)/g, '')
    .replace(/[:：]/g, '')
    .trim();
  // "밀푀유 재료 > 박력 밀가루" → "박력 밀가루"
  if (name.includes('>')) name = name.slice(name.lastIndexOf('>') + 1).trim();
  // "쇠고기 양념장 생강즙", "닭고기 삶는 재료 된장", "재료 물" → 분류명 뒤의 재료만
  const prefixed = name.match(/^(.*(?:양념장?|재료|드레싱|소스))\s+(\S.*)$/);
  if (prefixed) {
    if (/양념|드레싱|소스/.test(prefixed[1])) ctx = 'seasoning';
    name = prefixed[2].trim();
  }
  // "양파다진것" → "양파"
  name = name.replace(/\s*다진\s*것$/, '');
  const amount = (m ? m[2] : '').trim() || '적당량';
  if (!name || name.length > 20 || /^\d/.test(name)) return undefined;
  name = name.replace(/\s{2,}/g, ' ');
  const key = compact(name);
  return {
    name,
    amount,
    ...(ctx === 'optional' && { optional: true }),
    ...((ctx === 'seasoning' || SEASONINGS.has(key)) && { seasoning: true }),
  };
}

function parseIngredients(raw, title) {
  const out = [];
  const seen = new Set();
  let ctx = 'main';
  const lines = (raw ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let line of lines) {
    line = line.replace(/^[•·\-*●○]\s*/, '').replace(/^\[.*?\]\s*/, '');
    if (compact(line) === compact(title)) continue;
    // 헤더만 있는 줄: "양념장", "고명", "주재료"
    if (!/[,\d]/.test(line) && line.length <= 15 && !/약간|적당량/.test(line)) {
      ctx = contextOf(line);
      continue;
    }
    // "양념장 : 간장 10g, ..." 처럼 헤더가 앞에 붙은 줄
    let lineCtx = ctx;
    const header = line.match(/^([^:：,\d()]{1,12})\s*[:：]\s*(.+)$/);
    if (header) {
      lineCtx = contextOf(header[1]);
      line = header[2];
    }
    line = line.replace(/^(주재료|부재료|재료)\s+/, '');
    // 콜론 없이 분류명이 앞에 붙은 줄: "양념 참기름 5g, ...", "시금치우유 소스 우유 100g"
    const inlineHeader = line.match(/^(\S*(?:양념장?|소스|드레싱|국물|육수|고명|토핑))\s+(.+)$/);
    if (!header && inlineHeader && /\d|약간|적당량/.test(inlineHeader[2])) {
      lineCtx = contextOf(inlineHeader[1]);
      line = inlineHeader[2];
    }
    for (const part of splitItems(line)) {
      const item = parseItem(part, lineCtx);
      if (!item || seen.has(compact(item.name))) continue;
      seen.add(compact(item.name));
      out.push(item);
    }
  }
  return out;
}

function parseSteps(row) {
  const steps = [];
  for (let i = 1; i <= 20; i++) {
    const n = String(i).padStart(2, '0');
    const raw = (row[`MANUAL${n}`] ?? '').replace(/\r?\n/g, ' ').trim();
    if (!raw) continue;
    // 원본은 "1. ...한다.a" 처럼 번호와 이미지 표시 글자가 붙어 있다.
    const text = raw.replace(/^\d+\.\s*/, '').replace(/([.!?다요])\s*[a-z]$/, '$1').trim();
    const image = https(row[`MANUAL_IMG${n}`]);
    steps.push({ text, ...(image && { image }) });
  }
  return steps;
}

const num = (v) => {
  const x = Number.parseFloat(v);
  return Number.isFinite(x) ? x : undefined;
};

// 원본에 조리 시간이 없어 추정한다: 손질 기본 시간 + 단계 수 + 재료 수 + 설명에 적힌 "N분" + 조리법별 시간
const METHOD_MINUTES = { 끓이기: 10, 찌기: 8, 굽기: 6, 튀기기: 6, 볶기: 3, 기타: 3 };
function estimateMinutes(steps, coreCount, method) {
  const explicit = steps.reduce((sum, s) => sum + [...s.text.matchAll(/(\d+)\s*분/g)].reduce((a, m) => a + Number(m[1]), 0), 0);
  const estimate = 5 + steps.length * 2 + coreCount + Math.min(explicit, 60) + (METHOD_MINUTES[method] ?? 0);
  return Math.min(90, Math.max(10, Math.round(estimate / 5) * 5));
}

function transform(row) {
  const title = row.RCP_NM.trim();
  const ingredients = parseIngredients(row.RCP_PARTS_DTLS, title);
  const steps = parseSteps(row);
  const core = ingredients.filter((i) => !i.seasoning && !i.optional);
  const nutrition = {
    weight: num(row.INFO_WGT),
    kcal: num(row.INFO_ENG),
    carbs: num(row.INFO_CAR),
    protein: num(row.INFO_PRO),
    fat: num(row.INFO_FAT),
    sodium: num(row.INFO_NA),
  };

  const cuisine = row.RCP_PAT2 === '후식' ? '간식' : WESTERN.test(title) ? '양식' : CHINESE.test(title) ? '중식' : '한식';
  const tags = [];
  // 공공 레시피는 대부분 저칼로리라 기준을 낮게 잡는다 (1인분 150kcal ≈ 하위 35%).
  if (nutrition.kcal !== undefined && nutrition.kcal <= 150 && row.RCP_PAT2 !== '후식') tags.push('다이어트');
  if (nutrition.protein !== undefined && nutrition.protein >= 20) tags.push('고단백');
  if (core.length <= 5) tags.push('자취');
  if (core.length <= 6 && !PRICEY.test(core.map((i) => i.name).join(' '))) tags.push('저예산');

  const minutes = estimateMinutes(steps, core.length, row.RCP_WAY2);
  // 난이도도 원본에 없어 재료 수와 시간으로 추정한다.
  const difficulty = core.length <= 6 && minutes <= 30 ? '쉬움' : core.length >= 11 || minutes >= 50 ? '어려움' : '보통';
  const summaryParts = [row.RCP_PAT2, row.RCP_WAY2].filter(Boolean);
  const hashTag = (row.HASH_TAG ?? '').trim();

  return {
    id: `fs-${row.RCP_SEQ}`,
    source: 'foodsafety',
    source_id: String(row.RCP_SEQ),
    title,
    summary: summaryParts.join(' · ') + (hashTag ? ` · #${hashTag}` : ''),
    cuisine,
    tags,
    difficulty,
    minutes,
    minutes_estimated: true,
    servings: 1,
    tint: '#F3EEE6',
    image_url: https(row.ATT_FILE_NO_MK) ?? https(row.ATT_FILE_NO_MAIN),
    thumb_url: https(row.ATT_FILE_NO_MAIN) ?? https(row.ATT_FILE_NO_MK),
    nutrition,
    tip: (row.RCP_NA_TIP ?? '').trim() || undefined,
    ingredients,
    steps,
  };
}

// ─── 3. SQL ─────────────────────────────────────────────────────────────────

const lit = (v) => (v === undefined || v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const COLUMNS = [
  'id', 'source', 'source_id', 'title', 'summary', 'cuisine', 'tags', 'difficulty', 'minutes',
  'minutes_estimated', 'servings', 'tint', 'image_url', 'thumb_url', 'nutrition', 'tip', 'ingredients', 'steps',
];

function toSql(recipes) {
  const values = recipes.map((r) =>
    [
      lit(r.id), lit(r.source), lit(r.source_id), lit(r.title), lit(r.summary), lit(r.cuisine),
      `array[${r.tags.map(lit).join(',')}]::text[]`, lit(r.difficulty), r.minutes, r.minutes_estimated, r.servings,
      lit(r.tint), lit(r.image_url), lit(r.thumb_url), `${lit(JSON.stringify(r.nutrition))}::jsonb`, lit(r.tip),
      `${lit(JSON.stringify(r.ingredients))}::jsonb`, `${lit(JSON.stringify(r.steps))}::jsonb`,
    ].join(', '),
  );
  const updates = COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  return (
    `insert into public.recipes (${COLUMNS.join(', ')}) values\n(${values.join('),\n(')})\n` +
    `on conflict (id) do update set ${updates.join(', ')}, updated_at = now();\n`
  );
}

// ─── 실행 ──────────────────────────────────────────────────────────────────

const env = readEnv(path.join(ROOT, '.env'));
const key = process.env.FOODSAFETY_API_KEY || env.FOODSAFETY_API_KEY;
if (!key) {
  console.error('.env 에 FOODSAFETY_API_KEY 가 없습니다.');
  process.exit(1);
}

console.log('레시피 받는 중…');
const rows = await fetchAll(key);
const recipes = rows
  .map(transform)
  .filter((r) => r.ingredients.some((i) => !i.seasoning) && r.steps.length > 0);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'recipes.json'), JSON.stringify(recipes, null, 1));

const count = (pred) => recipes.filter(pred).length;
console.log(`\n받음 ${rows.length}건 → 사용 ${recipes.length}건 (재료·단계가 없는 ${rows.length - recipes.length}건 제외)`);
console.log('요리 종류:', ['한식', '양식', '중식', '간식'].map((c) => `${c} ${count((r) => r.cuisine === c)}`).join(', '));
console.log('태그:', ['다이어트', '고단백', '자취', '저예산'].map((t) => `${t} ${count((r) => r.tags.includes(t))}`).join(', '));
console.log('사진 있음:', count((r) => r.image_url), '| 평균 재료 수:', (recipes.reduce((a, r) => a + r.ingredients.length, 0) / recipes.length).toFixed(1));

if (APPLY) {
  const CHUNK = 150;
  for (let i = 0; i < recipes.length; i += CHUNK) {
    const file = path.join(OUT_DIR, `recipes-${String(i / CHUNK).padStart(2, '0')}.sql`);
    fs.writeFileSync(file, toSql(recipes.slice(i, i + CHUNK)));
    const args = ['supabase', 'db', 'query', '--linked', '--project-ref', PROJECT_REF, '-f', file];
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
    console.log(`  적용 ${Math.min(i + CHUNK, recipes.length)} / ${recipes.length}`);
  }
}
