-- 요리별 대체 재료 확인 결과 (AI가 대체 재료 표의 후보를 이 요리 기준으로 평가한 것)
-- check-substitutes 함수가 처음 요청될 때 만들어 저장하고, 이후 요청에는 저장된 값을 돌려준다.
--
-- 적용: npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20261024000000_recipe_substitutes.sql

create table if not exists public.recipe_substitutes (
  recipe_id  text primary key references public.recipes (id) on delete cascade,
  items      jsonb not null,   -- [{ name, role, omit: { possible, note }, candidates: [{ name, fit, note }] }]
  model      text not null,
  created_at timestamptz not null default now()
);

alter table public.recipe_substitutes enable row level security;

-- 읽기는 누구나, 쓰기는 서버 함수(secret 키)만
drop policy if exists "recipe substitutes are readable by everyone" on public.recipe_substitutes;
create policy "recipe substitutes are readable by everyone"
  on public.recipe_substitutes for select
  to anon, authenticated
  using (true);

grant select on public.recipe_substitutes to anon, authenticated;
