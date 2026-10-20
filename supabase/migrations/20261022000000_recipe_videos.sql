-- 레시피 참고 영상 (유튜브 검색 결과를 저장해 모든 사용자가 같이 쓴다)
-- find-video 함수가 처음 요청될 때 검색해 저장한다. 맞는 영상이 없으면 video_id를 비워 저장해 다시 검색하지 않는다.
--
-- 적용: npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20261022000000_recipe_videos.sql

create table if not exists public.recipe_videos (
  recipe_id   text primary key references public.recipes (id) on delete cascade,
  video_id    text,            -- 유튜브 영상 ID (없으면 null)
  title       text,
  channel     text,
  duration_s  integer,
  searched_at timestamptz not null default now()
);

alter table public.recipe_videos enable row level security;

-- 읽기는 누구나, 쓰기는 서버 함수(secret 키)만
drop policy if exists "recipe videos are readable by everyone" on public.recipe_videos;
create policy "recipe videos are readable by everyone"
  on public.recipe_videos for select
  to anon, authenticated
  using (true);

grant select on public.recipe_videos to anon, authenticated;
