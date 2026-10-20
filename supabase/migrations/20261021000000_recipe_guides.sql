-- AI 보충 설명 (원본 레시피는 그대로 두고 별도로 저장한다)
-- explain-recipe 함수가 처음 요청될 때 만들어 저장하고, 이후 요청에는 저장된 값을 돌려준다.
--
-- 적용: npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20261021000000_recipe_guides.sql

create table if not exists public.recipe_guides (
  recipe_id  text primary key references public.recipes (id) on delete cascade,
  guide      jsonb not null,   -- { overview, prep[], steps[{ index, tips[] }], cautions[] }
  model      text not null,
  created_at timestamptz not null default now()
);

alter table public.recipe_guides enable row level security;

-- 읽기는 누구나, 쓰기는 서버 함수(secret 키)만
drop policy if exists "recipe guides are readable by everyone" on public.recipe_guides;
create policy "recipe guides are readable by everyone"
  on public.recipe_guides for select
  to anon, authenticated
  using (true);

grant select on public.recipe_guides to anon, authenticated;
