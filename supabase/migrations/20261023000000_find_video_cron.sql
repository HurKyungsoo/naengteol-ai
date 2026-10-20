-- 참고 영상 미리 찾기 (매일, 유튜브 무료 할당량 안에서)
-- find-video 함수를 { batch: 33 } 으로 하루 세 번 불러 아직 검색하지 않은 레시피를 하루 99개씩 채운다.
-- 함수가 끝에 30일 지난 영상이 아직 재생 가능한지도 다시 확인한다.
--
-- 유튜브 할당량은 미국 태평양 시간 자정(한국 오후 4~5시)에 초기화되므로 그 뒤(UTC 08:30~08:50)에 돈다.
--
-- 사전 준비 (한 번만, 키 값은 이 파일에 넣지 않는다):
--   1) 함수 secret:  npx supabase secrets set CRON_KEY=<임의의 긴 값> --project-ref <ref>
--   2) DB vault:     select vault.create_secret('<같은 값>', 'find_video_cron_key');
-- 적용: npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20261023000000_find_video_cron.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.run_find_video_batch(n integer)
returns void
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := 'https://qxzeuxidlotgzbhcqugj.supabase.co/functions/v1/find-video',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'find_video_cron_key')
    ),
    body := jsonb_build_object('batch', n),
    timeout_milliseconds := 140000
  );
$$;

revoke all on function public.run_find_video_batch(integer) from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname like 'find-video-%';
select cron.schedule('find-video-1', '30 8 * * *', $$select public.run_find_video_batch(33)$$);
select cron.schedule('find-video-2', '40 8 * * *', $$select public.run_find_video_batch(33)$$);
select cron.schedule('find-video-3', '50 8 * * *', $$select public.run_find_video_batch(33)$$);
