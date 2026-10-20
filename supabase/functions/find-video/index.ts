// Supabase Edge Function: 공공 레시피의 참고 영상 찾기 (YouTube Data API)
//
// 앱이 보낸 검색어가 아니라 DB의 레시피 이름으로 검색하기 때문에, 이 함수로 임의의 검색을 할 수 없다.
// 찾은 결과(없음 포함)는 recipe_videos 테이블에 저장해 모든 사용자가 같이 쓴다.
// 영상은 앱에서 유튜브 공식 플레이어로만 재생한다 (조회수·수익은 원작자에게 간다).
//
// secrets: YOUTUBE_API_KEY, APP_KEY(analyze-fridge와 같음)
// 자동 제공: SUPABASE_URL, SUPABASE_SECRET_KEYS
//
// 할당량: 검색 1회 100 + 영상 정보 1 = 약 101 단위. 무료 하루 10,000 단위 → 새 레시피 약 99개/일.

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const MIN_SECONDS = 30;
const MAX_SECONDS = 20 * 60;

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

type Video = { videoId: string; title: string; channel: string; durationS: number };

const compact = (s: string) => s.replace(/\s+/g, '').toLowerCase();

/** "[15분컷] 단호박 영양밥(전기밥솥)" → ["단호박", "영양밥"] — 괄호 안 설명은 빼고 두 글자 이상 낱말만 */
function keywords(title: string): string[] {
  return title
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .split(/[\s,·&/+]+/)
    .map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, ''))
    .filter((w) => w.length >= 2);
}

/** ISO 8601 기간 "PT4M13S" → 253 */
function seconds(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function searchVideo(title: string, apiKey: string): Promise<Video | null | { quota: true }> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${title.replace(/\(.*?\)|\[.*?\]/g, ' ').trim()} 레시피`,
    type: 'video',
    maxResults: '10',
    regionCode: 'KR',
    relevanceLanguage: 'ko',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key: apiKey,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (res.status === 403) return { quota: true };
  if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const items = ((await res.json()).items ?? []) as { id: { videoId: string } }[];
  const ids = items.map((i) => i.id.videoId).filter(Boolean);
  if (ids.length === 0) return null;

  const detail = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: 'snippet,contentDetails,status', id: ids.join(','), key: apiKey })}`,
  );
  if (!detail.ok) throw new Error(`videos ${detail.status}`);
  const videos = ((await detail.json()).items ?? []) as {
    id: string;
    snippet: { title: string; channelTitle: string };
    contentDetails: { duration: string };
    status: { embeddable: boolean };
  }[];

  // 제목에 레시피 이름의 낱말이 많이 들어간 영상을 고른다. 하나도 없으면 엉뚱한 영상일 가능성이 커서 쓰지 않는다.
  const words = keywords(title);
  let best: { video: Video; score: number; rank: number } | null = null;
  for (const v of videos) {
    const durationS = seconds(v.contentDetails.duration);
    if (!v.status.embeddable || durationS < MIN_SECONDS || durationS > MAX_SECONDS) continue;
    const name = compact(decode(v.snippet.title));
    const score = words.filter((w) => name.includes(compact(w))).length;
    if (score === 0) continue;
    const rank = ids.indexOf(v.id); // 같은 점수면 유튜브 검색 순서(관련도)를 따른다
    if (!best || score > best.score || (score === best.score && rank < best.rank)) {
      best = {
        video: { videoId: v.id, title: decode(v.snippet.title), channel: decode(v.snippet.channelTitle), durationS },
        score,
        rank,
      };
    }
  }
  return best?.video ?? null;
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

  // 1. 이미 찾아 둔 결과가 있으면 그대로 돌려준다 (할당량 사용 없음)
  const cached = await db(`recipe_videos?recipe_id=eq.${recipeId}&select=video_id,title,channel,duration_s`).then((r) =>
    r.json(),
  );
  if (Array.isArray(cached) && cached[0]) {
    const c = cached[0];
    const video = c.video_id ? { videoId: c.video_id, title: c.title, channel: c.channel, durationS: c.duration_s } : null;
    return json({ video, cached: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'too many requests' }, 429);

  // 2. DB의 레시피 이름으로 검색한다
  const rows = await db(`recipes?id=eq.${recipeId}&select=title`).then((r) => r.json());
  const title = Array.isArray(rows) ? (rows[0]?.title as string | undefined) : undefined;
  if (!title) return json({ error: 'recipe not found' }, 404);

  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) return json({ error: 'server not configured' }, 500);
  let video: Video | null;
  try {
    const found = await searchVideo(title, apiKey);
    // 오늘 할당량을 다 쓴 경우: 저장하지 않고 나중에 다시 찾게 한다.
    if (found && 'quota' in found) return json({ error: 'quota exceeded' }, 503);
    video = found;
  } catch (e) {
    console.error(e);
    return json({ error: 'search failed' }, 502);
  }

  // 3. 저장해서 다음 요청부터는 바로 돌려준다
  const saved = await db('recipe_videos', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      recipe_id: recipeId,
      video_id: video?.videoId ?? null,
      title: video?.title ?? null,
      channel: video?.channel ?? null,
      duration_s: video?.durationS ?? null,
    }),
  });
  if (!saved.ok) console.error('save failed', saved.status, (await saved.text()).slice(0, 300));

  return json({ video, cached: false });
});
