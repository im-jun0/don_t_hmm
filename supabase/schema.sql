-- dont-hmm: Supabase 스키마
--
-- 사용법
-- 1) 아래 admin_pin 값을 원하는 긴 문자열로 바꿔주세요 (숫자 4자리 X)
-- 2) Supabase 프로젝트 > SQL Editor 에 이 파일 전체를 붙여넣고 실행
-- 3) 스키마를 바꾸고 싶으면 이 파일을 고치고 SQL Editor 에서 다시 실행 (또는 필요한 부분만)
--
-- 구조
--   users  : 사이트를 쓰는 사람 (기존 구글시트의 탭 1개)
--   items  : 사용자별 행위자/행위명/카운트 + background_color/background_image_url (카드 꾸미기, PIN 없음)
--   events : 클릭 1번 = 1행. 현황 페이지의 일자별 추이 계산용
--   item_daily_counts : 항목별 x 날짜별 카운트. 카드에 보이는 "오늘" 숫자를 여기서 읽어요
--   app_config : 항목관리 PIN 저장
--   users.auth_user_id : 카카오(Supabase Auth) 계정 1개 = 사용자 1명 연결
--   storage.item-backgrounds : 카드 배경 이미지 업로드 버킷 (공개 읽기, 누구나 업로드)

create extension if not exists "pgcrypto";

create table if not exists app_config (
  key text primary key,
  value text not null
);

insert into app_config (key, value) values ('admin_pin', '7777')
  on conflict (key) do nothing;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  actor text not null,
  name text not null,
  count int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists items_user_sort_idx on items(user_id, sort_order);

alter table items add column if not exists background_color text;
alter table items add column if not exists background_image_url text;

alter table items drop constraint if exists items_background_color_check;
alter table items add constraint items_background_color_check
  check (background_color is null or background_color ~ '^#[0-9a-fA-F]{6}$');

alter table items drop constraint if exists items_background_image_url_check;
alter table items add constraint items_background_image_url_check
  check (background_image_url is null or background_image_url ~ '^https://');

create table if not exists events (
  id bigserial primary key,
  item_id uuid not null references items(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists events_item_created_idx on events(item_id, created_at);

alter table users enable row level security;
alter table items enable row level security;
alter table events enable row level security;
alter table app_config enable row level security;

-- 조회는 누구나 (메인/현황 화면). 쓰기 정책은 없음 -> anon 직접 insert/update/delete 전부 차단.
-- events, app_config 는 select 정책도 없음 -> RPC 로만 접근.
drop policy if exists users_select on users;
create policy users_select on users for select using (true);

drop policy if exists items_select on items;
create policy items_select on items for select using (true);

-- ── PIN 검증 헬퍼 (anon 에게 execute 부여 안 함 = admin_* 함수 내부에서만 호출 가능) ──
create or replace function check_pin_(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin is null or p_pin <> (select value from app_config where key = 'admin_pin') then
    raise exception 'invalid pin';
  end if;
end;
$$;

-- ── 날짜별 카운트 이력 ──
-- 카드에 보이는 숫자는 "오늘" 눌린 횟수예요. 자정이 지나면 그날 행이 없으니 저절로 0 이 돼요.
-- 그래서 자정에 뭔가를 지우는 스케줄러가 필요 없어요. 안 도는 크론이 제일 무서우니까요.
--
-- 누적은 예전 그대로 items.count 에 남아요. 현황과 랭킹은 계속 그걸 봐요.
-- (시트에서 넘어오기 전 기록이 items.count 에만 있어서, 이력에서 다시 더하면 그만큼이 날아가요)
create table if not exists item_daily_counts (
  item_id uuid not null references items(id) on delete cascade,
  day date not null,                    -- KST 기준 날짜
  count int not null default 0,
  primary key (item_id, day)
);
create index if not exists item_daily_counts_day_idx on item_daily_counts(day);

alter table item_daily_counts enable row level security;
-- 정책 없음 = 직접 접근 차단. 아래 RPC 로만 읽고 써요.

-- 이미 쌓여 있는 events 를 날짜별로 옮겨 담아요.
-- 오늘 눌린 것까지 그대로 살아나요. 여러 번 실행해도 안전해요.
insert into item_daily_counts (item_id, day, count)
select e.item_id, (e.created_at at time zone 'Asia/Seoul')::date, count(*)::int
  from events e
 group by 1, 2
on conflict (item_id, day) do nothing;

-- ── 카운트 증가 ──
-- 누적(items.count)과 오늘치(item_daily_counts)를 같이 올리고, 카드에 보여줄 오늘치를 돌려줘요.
create or replace function increment_item(p_item_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  today_count int;
begin
  update items set count = count + 1 where id = p_item_id;
  if not found then
    raise exception 'item not found';
  end if;

  insert into item_daily_counts (item_id, day, count)
    values (p_item_id, today, 1)
    on conflict (item_id, day) do update set count = item_daily_counts.count + 1
    returning count into today_count;

  insert into events (item_id) values (p_item_id);
  return today_count;
end;
$$;

-- ── 일자별 추이 (현황 페이지 라인차트) ──
create or replace function daily_counts(p_user_id uuid, p_days int default 14)
returns table (day date, count bigint)
language sql
security definer
set search_path = public
as $$
  select
    (e.created_at at time zone 'Asia/Seoul')::date as day,
    count(*) as count
  from events e
  join items i on i.id = e.item_id
  where i.user_id = p_user_id
    and e.created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;

-- ── 카드 꾸미기 (배경색/배경이미지, PIN 없음 — 카운트 클릭처럼 누구나) ──
create or replace function set_item_style(p_item_id uuid, p_background_color text, p_background_image_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update items set background_color = p_background_color, background_image_url = p_background_image_url
    where id = p_item_id;
end;
$$;

-- ── 항목관리: 사용자 ──
create or replace function admin_verify_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform check_pin_(p_pin);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function admin_upsert_user(p_pin text, p_id uuid, p_name text, p_sort_order int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform check_pin_(p_pin);
  if p_id is null then
    insert into users (name, sort_order) values (p_name, p_sort_order)
      returning id into new_id;
  else
    update users set name = p_name, sort_order = p_sort_order where id = p_id
      returning id into new_id;
  end if;
  return new_id;
end;
$$;

create or replace function admin_delete_user(p_pin text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform check_pin_(p_pin);
  delete from users where id = p_id;
end;
$$;

-- ── 항목관리: 항목 ──
create or replace function admin_upsert_item(
  p_pin text, p_id uuid, p_user_id uuid, p_actor text, p_name text,
  p_count int, p_sort_order int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform check_pin_(p_pin);
  if p_id is null then
    insert into items (user_id, actor, name, count, sort_order)
      values (p_user_id, p_actor, p_name, coalesce(p_count, 0), p_sort_order)
      returning id into new_id;
  else
    update items set actor = p_actor, name = p_name,
        count = coalesce(p_count, count), sort_order = p_sort_order
      where id = p_id
      returning id into new_id;
  end if;
  return new_id;
end;
$$;

create or replace function admin_delete_item(p_pin text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform check_pin_(p_pin);
  delete from items where id = p_id;
end;
$$;

-- ── anon / authenticated 권한 ──
-- 로그인하면 역할이 anon -> authenticated 로 바뀌어요. 둘 다 줘야 로그인 후에도 화면이 돌아가요.
grant usage on schema public to anon, authenticated;
grant select on users, items to anon, authenticated;
grant execute on function
  increment_item(uuid),
  daily_counts(uuid, int),
  set_item_style(uuid, text, text),
  admin_verify_pin(text),
  admin_upsert_user(text, uuid, text, int),
  admin_delete_user(text, uuid),
  admin_upsert_item(text, uuid, uuid, text, text, int, int),
  admin_delete_item(text, uuid)
to anon, authenticated;

-- ── 이미지 업로드용 Storage 버킷 (배경 이미지) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-backgrounds', 'item-backgrounds', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "item-backgrounds public read" on storage.objects;
create policy "item-backgrounds public read" on storage.objects
  for select using (bucket_id = 'item-backgrounds');

drop policy if exists "item-backgrounds public upload" on storage.objects;
create policy "item-backgrounds public upload" on storage.objects
  for insert with check (bucket_id = 'item-backgrounds');

-- ── 카카오 로그인 (Supabase Auth) ──
-- Supabase 대시보드 > Authentication > Providers > Kakao 를 켠 뒤에 이 부분을 실행하세요.
-- 카카오 계정 1개 = users 행 1개. 최초 로그인 때 본인 이름을 한 번 연결하면 그 뒤로는 바로 열려요.

alter table users add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- 로그인한 사람에게 연결된 사용자 (없으면 0행 = 아직 이름 연결 전)
create or replace function my_user()
returns table (id uuid, name text, sort_order int)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.sort_order from users u where u.auth_user_id = auth.uid();
$$;

-- 아직 아무 카카오 계정과도 연결되지 않은 사용자 목록 (최초 1회 이름 연결 화면용)
create or replace function unlinked_users()
returns table (id uuid, name text, sort_order int)
language sql
security definer
set search_path = public
as $$
  select u.id, u.name, u.sort_order from users u
   where u.auth_user_id is null and auth.uid() is not null
   order by u.sort_order;
$$;

-- 기존 사용자 행을 내 카카오 계정에 연결
create or replace function claim_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from users where auth_user_id = auth.uid()) then
    raise exception 'already linked';
  end if;
  update users set auth_user_id = auth.uid()
    where id = p_user_id and auth_user_id is null
    returning id into linked_id;
  if linked_id is null then
    raise exception 'user not available';
  end if;
  return linked_id;
end;
$$;

-- 새 이름으로 시작 (연결할 기존 이름이 없을 때)
create or replace function create_my_user(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from users where auth_user_id = auth.uid()) then
    raise exception 'already linked';
  end if;
  insert into users (name, sort_order, auth_user_id)
    values (p_name, coalesce((select max(sort_order) from users), -1) + 1, auth.uid())
    returning id into new_id;
  return new_id;
end;
$$;

-- 로그인한 내 페이지의 + 버튼: 내 계정으로만, PIN 없이 바로 항목 추가
create or replace function add_my_item(p_actor text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_id uuid;
  new_id uuid;
begin
  select id into my_id from users where auth_user_id = auth.uid();
  if my_id is null then
    raise exception 'not linked';
  end if;
  insert into items (user_id, actor, name, sort_order)
    values (my_id, p_actor, p_name, coalesce((select max(sort_order) from items where user_id = my_id), -1) + 1)
    returning id into new_id;
  return new_id;
end;
$$;

grant execute on function
  my_user(),
  unlinked_users(),
  claim_user(uuid),
  create_my_user(text),
  add_my_item(text, text)
to authenticated;

-- ── 미니게임: Don't Hmm 30초 ──
-- 하루 1판, 업무시간 중 예고 없는 랜덤 시각에 시작돼요.
-- 라운드 생성과 푸시 발송은 /api/cron/tick 이 secret key 로 해요 (아래 RPC 는 전부 읽기/참여용).

create table if not exists game_rounds (
  id uuid primary key default gen_random_uuid(),
  round_date date not null unique,        -- KST 기준 하루 1판
  start_at timestamptz not null,
  duration_sec int not null default 30,
  notified_at timestamptz,                -- 푸시를 쏜 시각 (null 이면 아직)
  created_at timestamptz not null default now()
);

create table if not exists game_scores (
  round_id uuid not null references game_rounds(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  count int not null default 0,
  primary key (round_id, user_id)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table game_rounds enable row level security;
alter table game_scores enable row level security;
alter table push_subscriptions enable row level security;
-- 세 테이블 모두 정책 없음 = anon/authenticated 직접 접근 차단. RPC 와 secret key 로만 써요.

-- ── 지금 상태 (waiting: 오늘 판 대기 / live: 진행 중 / done: 끝) ──
-- 시작 시각은 대기 중엔 알려주지 않아요. 언제 올지 모르는 게 이 게임의 재미라서요.
create or replace function game_state()
returns table (
  round_id uuid,
  status text,
  ends_at timestamptz,
  server_now timestamptz,
  my_count int
)
language sql
security definer
set search_path = public
as $$
  select r.id,
         case when now() < r.start_at then 'waiting'
              when now() < r.start_at + make_interval(secs => r.duration_sec) then 'live'
              else 'done' end,
         case when now() < r.start_at then null
              else r.start_at + make_interval(secs => r.duration_sec) end,
         now(),
         coalesce(s.count, 0)::int
    from game_rounds r
    left join users u on u.auth_user_id = auth.uid()
    left join game_scores s on s.round_id = r.id and s.user_id = u.id
   order by r.start_at desc
   limit 1;
$$;

-- ── 30초 동안 누르기 ──
create or replace function game_tap(p_round_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  next_count int;
begin
  select id into me from users where auth_user_id = auth.uid();
  if me is null then
    raise exception 'not linked';
  end if;

  -- 진행 중인 판에만 넣어요. (타이머가 끝난 뒤 늦게 도착한 탭은 버려요)
  if not exists (
    select 1 from game_rounds r
     where r.id = p_round_id
       and now() >= r.start_at
       and now() < r.start_at + make_interval(secs => r.duration_sec)
  ) then
    raise exception 'round not live';
  end if;

  insert into game_scores (round_id, user_id, count) values (p_round_id, me, 1)
    on conflict (round_id, user_id) do update set count = game_scores.count + 1
    returning count into next_count;
  return next_count;
end;
$$;

-- ── 이번 판 순위 (많이 누른 사람이 1등) ──
create or replace function game_ranking(p_round_id uuid)
returns table (rank int, name text, count int, is_me boolean)
language sql
security definer
set search_path = public
as $$
  select (rank() over (order by s.count desc))::int,
         u.name,
         s.count,
         u.auth_user_id = auth.uid()
    from game_scores s
    join users u on u.id = s.user_id
   where s.round_id = p_round_id
   order by s.count desc, u.name;
$$;

-- ── 누적 순위 ──
create or replace function game_leaderboard(p_days int default 30)
returns table (rank int, name text, count int, rounds int, is_me boolean)
language sql
security definer
set search_path = public
as $$
  with totals as (
    select u.name as name,
           u.auth_user_id as auth_user_id,
           sum(s.count)::int as total,
           count(*)::int as rounds
      from game_scores s
      join users u on u.id = s.user_id
      join game_rounds r on r.id = s.round_id
     where r.start_at >= now() - make_interval(days => p_days)
     group by u.id, u.name, u.auth_user_id
  )
  select (rank() over (order by t.total desc))::int, t.name, t.total, t.rounds, t.auth_user_id = auth.uid()
    from totals t
   order by t.total desc, t.name;
$$;

-- ── 푸시 알림 구독 ──
create or replace function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from users where auth_user_id = auth.uid();
  if me is null then
    raise exception 'not linked';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth)
    values (me, p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set user_id = me, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

create or replace function delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
begin
  select id into me from users where auth_user_id = auth.uid();
  delete from push_subscriptions where endpoint = p_endpoint and user_id = me;
end;
$$;

grant execute on function
  game_state(),
  game_tap(uuid),
  game_ranking(uuid),
  game_leaderboard(int),
  save_push_subscription(text, text, text),
  delete_push_subscription(text)
to authenticated;

-- ── 랭킹: 누적 카운트 ──
-- 사용자별로 items.count 를 전부 더해요. 많을수록 1등 (= 내 동료가 그만큼 부지런했다는 뜻)
create or replace function total_leaderboard()
returns table (rank int, name text, count int, is_me boolean)
language sql
security definer
set search_path = public
as $$
  with totals as (
    select u.id as id,
           u.name as name,
           u.auth_user_id as auth_user_id,
           coalesce(sum(i.count), 0)::int as total
      from users u
      left join items i on i.user_id = u.id
     group by u.id, u.name, u.auth_user_id
  )
  select (rank() over (order by t.total desc))::int, t.name, t.total, t.auth_user_id = auth.uid()
    from totals t
   order by t.total desc, t.name;
$$;

grant execute on function total_leaderboard() to authenticated;

-- ── 카드용 조회 ──
-- 오늘치와 누적을 한 번에 가져와요. 메인 카드는 today_count, 현황은 total_count 를 써요.
create or replace function items_with_counts(p_user_id uuid)
returns table (
  id uuid,
  actor text,
  name text,
  today_count int,
  total_count int,
  background_color text,
  background_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         i.actor,
         i.name,
         coalesce(d.count, 0)::int,
         i.count,
         i.background_color,
         i.background_image_url
    from items i
    left join item_daily_counts d
      on d.item_id = i.id
     and d.day = (now() at time zone 'Asia/Seoul')::date
   where i.user_id = p_user_id
   order by i.sort_order;
$$;

grant execute on function items_with_counts(uuid) to anon, authenticated;

-- ── 오늘 다 같이 얼마나 눌렀나 (현황 페이지) ──
-- 항목(카드) 단위로 오늘치를 돌려줘요. 미니 카드가 이미지/카운트/항목명을 그대로 보여줄 수 있게요.
-- 사용자는 오늘 합계가 많은 순, 그 안에서는 항목 등록 순이에요.
create or replace function today_items()
returns table (
  item_id uuid,
  actor text,
  name text,
  count int,
  background_color text,
  background_image_url text,
  user_name text,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select u.id, u.name, u.sort_order, u.auth_user_id,
           coalesce(sum(d.count), 0) as total
      from users u
      left join items i on i.user_id = u.id
      left join item_daily_counts d
        on d.item_id = i.id
       and d.day = (now() at time zone 'Asia/Seoul')::date
     group by u.id, u.name, u.sort_order, u.auth_user_id
  )
  select i.id,
         i.actor,
         i.name,
         coalesce(d.count, 0)::int,
         i.background_color,
         i.background_image_url,
         t.name,
         t.auth_user_id = auth.uid()
    from totals t
    join items i on i.user_id = t.id
    left join item_daily_counts d
      on d.item_id = i.id
     and d.day = (now() at time zone 'Asia/Seoul')::date
   order by t.total desc, t.sort_order, i.sort_order;
$$;

grant execute on function today_items() to anon, authenticated;
