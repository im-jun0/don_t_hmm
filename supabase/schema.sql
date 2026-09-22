-- dont-hmm: Supabase 스키마
--
-- 사용법
-- 1) 아래 admin_pin 값을 원하는 긴 문자열로 바꿔주세요 (숫자 4자리 X)
-- 2) Supabase 프로젝트 > SQL Editor 에 이 파일 전체를 붙여넣고 실행
-- 3) 스키마를 바꾸고 싶으면 이 파일을 고치고 SQL Editor 에서 다시 실행 (또는 필요한 부분만)
--
-- 구조
--   users  : 사이트를 쓰는 사람 (기존 구글시트의 탭 1개)
--   items  : 사용자별 행위자/행위명/카운트 (기존 구글시트의 행 1개)
--   events : 클릭 1번 = 1행. 현황 페이지의 일자별 추이 계산용
--   app_config : 항목관리 PIN 저장

create extension if not exists "pgcrypto";

create table if not exists app_config (
  key text primary key,
  value text not null
);

insert into app_config (key, value) values ('admin_pin', 'CHANGE_ME_TO_A_LONG_PIN')
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

-- ── 카운트 증가 (메인 화면 클릭) ──
create or replace function increment_item(p_item_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count int;
begin
  update items set count = count + 1 where id = p_item_id
    returning count into next_count;
  if next_count is null then
    raise exception 'item not found';
  end if;
  insert into events (item_id) values (p_item_id);
  return next_count;
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

-- ── anon 권한 ──
grant usage on schema public to anon;
grant select on users, items to anon;
grant execute on function
  increment_item(uuid),
  daily_counts(uuid, int),
  admin_verify_pin(text),
  admin_upsert_user(text, uuid, text, int),
  admin_delete_user(text, uuid),
  admin_upsert_item(text, uuid, uuid, text, text, int, int),
  admin_delete_item(text, uuid)
to anon;
