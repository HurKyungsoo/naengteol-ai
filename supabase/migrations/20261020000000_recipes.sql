-- 레시피 테이블
-- 기획서 8장은 recipes / recipe_ingredients / recipe_steps 로 나누는 설계지만,
-- MVP에서는 앱이 레시피 전체를 한 번에 받아 기기에 캐시하므로 재료·단계를 jsonb로 함께 둔다.
-- 재료별 검색이나 통계가 필요해지면 그때 테이블을 나눈다.
--
-- 적용: npx supabase db query --linked -f supabase/migrations/20261020000000_recipes.sql

create table if not exists public.recipes (
  id                text primary key,              -- 예: fs-28 (식품안전나라 RCP_SEQ 28)
  source            text not null,                 -- 'foodsafety'
  source_id         text,                          -- 원본 일련번호
  title             text not null,
  summary           text,
  cuisine           text not null,                 -- 한식 | 양식 | 중식 | 간식
  tags              text[] not null default '{}',  -- 다이어트 | 고단백 | 자취 | 저예산
  difficulty        text not null,                 -- 쉬움 | 보통 | 어려움 (원본에 없어 추정)
  minutes           integer not null,              -- 조리 시간 (원본에 없어 추정)
  minutes_estimated boolean not null default true,
  servings          integer not null default 1,    -- 영양정보가 1인분 기준
  tint              text,
  image_url         text,                          -- 완성 사진 (큰 것)
  thumb_url         text,                          -- 완성 사진 (작은 것)
  nutrition         jsonb,                         -- { kcal, carbs, protein, fat, sodium, weight } 1인분
  tip               text,                          -- 저감 조리법 TIP
  ingredients       jsonb not null,                -- [{ name, amount, optional?, seasoning? }]
  steps             jsonb not null,                -- [{ text, image? }]
  updated_at        timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- 레시피는 누구나 읽을 수만 있다. 쓰기는 관리용 스크립트(CLI)로만 한다.
drop policy if exists "recipes are readable by everyone" on public.recipes;
create policy "recipes are readable by everyone"
  on public.recipes for select
  to anon, authenticated
  using (true);

grant select on public.recipes to anon, authenticated;
