# 방(room) 단위 분리 — 작업 계획 + 진행 로그

> **다른 PC에서 이어서 작업할 때**: 이 문서를 Claude Code한테 읽게 하고 "이 계획대로 이어서 진행해줘"라고 하세요.
> Claude는 아래 **체크리스트**로 어디까지 됐는지 확인하고, **진행 로그**의 가장 최신 항목부터 읽어서 직전 세션이 뭘 했고 뭐가 막혔는지 파악한 뒤 이어가면 됩니다.
> 세션을 마칠 때는 이 문서의 [진행 로그](#진행-로그)에 새 항목을 **맨 위에** 추가하고 커밋(+push)하세요 — 템플릿은 로그 섹션 맨 위에 있어요.

## 체크리스트

- [ ] 1. 스키마 (`rooms` 테이블, `users`/`items`/`game_rounds`에 `room_id`, RLS, `app_config` 폐기, 마이그레이션)
- [ ] 2. RPC 변경 (room 스코프 파라미터/필터, 신규 `create_room`/`join_room_by_lookup`)
- [ ] 3. 라우팅 (`src/app/r/[roomId]/...` 로 이동, `/`는 방 목록으로 교체)
- [ ] 4. AppShell (roomId 없으면 헤더만, 하단바/메뉴 숨김)
- [ ] 5. 인증 훅 분리 (`useAuth` 전역화 + `useMyRoomUser(roomId)` 신규)
- [ ] 6. 방 목록 화면 (`RoomFinder`: 내 방 카드 그리드 + 코드로 참여 + 새 방 만들기)
- [ ] 7. `api.ts` / 각 뷰 컴포넌트에 `roomId` 꿰기 (HabitCounter/StatsView/GameView/RankingView/ManageView)
- [ ] 8. 게임 cron (`/api/cron/tick`이 모든 방을 순회)

---

## Context

지금까지 "don't hmm"은 완전히 단일 테넌트 앱이었다 — `users`/`items`부터 게임/랭킹/힘내요까지 로그인한 모든 사람이 같은 데이터를 공유했다. 이제 이걸 "방(room)" 단위로 쪼갠다: 서로 다른 방은 서로 다른 팀/그룹처럼 완전히 독립된 카운터·현황·게임·랭킹·힘내요를 가진다. 확정된 요구사항:

- 한 카카오 계정으로 **여러 방에 가입**할 수 있고, 로그인 후 항상 "방 목록" 화면에서 시작해서 방을 고른 뒤에야 메인(카운터)과 하단 메뉴바가 보인다.
- 분리 범위는 **전부** — 카운터, 현황, 게임, 랭킹, 힘내요 모두 방 안에서만 집계된다.
- 방 가입은 **초대코드** 방식 (승인 대기 없음). 방 목록 화면엔 내가 이미 속한 방만 카드로 보이고, "코드로 참여" / "새 방 만들기" 두 액션이 같이 있다.
- 관리(PIN) 기능도 **방마다 독립적** — 방을 만들 때 방장이 직접 PIN을 정한다. 지금의 전역 `app_config.admin_pin`은 폐기.
- 방 카드는 지금 카운터 카드와 같은 룩인데 카운트 자리에 방 이름이 들어간 형태. PC는 고정 크기 그리드로 바둑판식, 모바일은 한 줄에 하나씩.

같은 테이블을 그대로 쓰되(별도 스키마/DB 분리 아님) `room_id` 컬럼 + RLS로 논리적 분리를 만든다. 단, 이 앱의 쓰기 경로는 전부 `security definer` RPC인데, **`security definer` 함수는 기본적으로 RLS를 우회한다** (postgres 소유자 권한으로 실행되기 때문). 그래서:
- RLS는 클라이언트가 테이블을 **직접 select** 하는 경로(방 목록, 이 방의 사용자 목록)에서 실질적으로 방을 가른다.
- 그 외 모든 RPC(쓰기·집계 조회)는 본문 안에서 **명시적으로 room_id를 확인**해야 실제로 막힌다 (지금 `increment_item`이 `auth.uid()`로 소유권을 확인하는 것과 같은 패턴을 room에도 적용).

## 1. 스키마 (`supabase/schema.sql`)

**`rooms` 테이블 (신규)**
```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,   -- 참여용 코드 (예: 8자리 랜덤)
  admin_pin text not null,            -- 방장이 방 생성 시 직접 입력
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table rooms enable row level security;
create policy rooms_select on rooms for select using (
  id in (select room_id from users where auth_user_id = auth.uid())
);
```
가입한 방만 보이는 게 이 정책 하나로 끝난다 — `fetchMyRooms()`는 RPC 없이 `supabase.from("rooms").select()` 직접 호출로 충분 (지금 `fetchUsers()`가 `users` 테이블을 직접 읽는 것과 같은 패턴, `src/lib/api.ts`).

**`users`에 `room_id` 추가** — 이게 핵심이다. "방 가입"은 별도 멤버십 테이블이 필요 없다: 그 방에 내 `users` 행이 있다 = 그 방의 멤버다 (지금의 "이름 연결"이 곧 "방 가입"이 된다).
```sql
alter table users add column room_id uuid references rooms(id) on delete cascade;
alter table users drop constraint users_name_key;
alter table users add constraint users_room_name_key unique (room_id, name);
alter table users drop constraint users_auth_user_id_key; -- 있다면
alter table users add constraint users_room_auth_key unique (room_id, auth_user_id);
```
`users_select` 정책(지금 `using (true)`)을 방 기준으로 좁힌다:
```sql
create policy users_select on users for select using (
  room_id in (select room_id from users u2 where u2.auth_user_id = auth.uid())
);
```

**`items`에 `room_id` 추가** (조회/RLS를 단순하게 하려고 `user_id` join 없이 직접 붙임). `items_select` 정책도 같은 패턴.

**`game_rounds`에 `room_id` 추가**, `round_date` 전역 unique → `unique(room_id, round_date)`로 교체. `game_scores`/`push_subscriptions`/`cheers`는 각각 `user_id`(또는 `round_id`)를 통해 이미 room-scoped `users`/`game_rounds`에 묶이므로 컬럼 추가 불필요.

**`app_config` 폐기.** PIN이 `rooms.admin_pin`으로 옮겨가므로 `check_pin_()`이 `p_room_id`를 받아 그 방의 PIN과 비교하도록 바꾸고, 마이그레이션 후 `drop table app_config`.

**마이그레이션 (기존 데이터 보존)**: schema.sql 맨 앞부분에 1회성 백필 블록 추가 — `rooms`에 레거시 방 하나(`name`="기존 멤버" 정도, `admin_pin`은 지금 `app_config.admin_pin` 값, `invite_code`는 랜덤 생성) 만들고, 기존 `users`/`items`/`game_rounds`의 `room_id`를 전부 그 방으로 채운 뒤 컬럼을 `not null`로 잠근다. 기존에 로그인해서 `auth_user_id`가 이미 연결된 사람들은 그대로 그 방의 멤버가 된다.

## 2. RPC 변경 패턴 (`supabase/schema.sql`)

두 가지 패턴이 반복된다.

**A. "내 것" 조회/수정 계열** — 지금 `select id from users where auth_user_id = auth.uid()`로 "나"를 찾는 함수들(`increment_item`, `set_item_style`, `delete_my_item`, `update_my_item`, `game_tap`)은 대상 row(`items`/`game_rounds`)가 이미 `room_id`를 갖고 있으니, **그 행의 room_id로 상관 서브쿼리를 제한**하면 끝 — 새 파라미터 불필요:
```sql
update items set count = count + 1
  where id = p_item_id
    and user_id = (select id from users where auth_user_id = auth.uid() and room_id = items.room_id);
```

**B. "지금 어느 방인지 알아야만 하는" 계열** — 내가 여러 방에 있을 수 있어서 room을 명시적으로 안 주면 "나"를 특정 못 하는 함수들은 `p_room_id uuid`를 새 첫 파라미터로 추가: `my_user`, `unlinked_users`, `create_my_user`, `add_my_item`, `save_push_subscription`, `delete_push_subscription`, `game_state`, `today_items`, `total_leaderboard`, `cheer_leaderboard`, `game_leaderboard`, `items_with_counts`(소유 room 검증 추가), `admin_verify_pin`/`admin_upsert_user`/`admin_delete_user`/`admin_upsert_item`/`admin_delete_item`(+ `check_pin_`).

**신규 RPC**: `create_room(p_name text, p_pin text) returns uuid` — 방 생성 + 카카오 닉네임으로 자동 이름 연결까지 한 번에. `join_room_by_lookup(p_code text) returns table(id uuid, name text)` — 코드로 방을 찾아 반환만 함(가입 자체는 기존 `unlinked_users`/`create_my_user` 플로우를 그 방 id로 재사용).

`claim_user`/`game_ranking`은 대상 row가 이미 room을 들고 있어 시그니처 변경 불필요.

## 3. 라우팅 (`src/app/`)

지금 해시(`#/이름`)로 "누구 화면인지"를 들고 다니는 방식은 Next.js 클라이언트 네비게이션에서 해시가 사라지는 문제(CLAUDE.md에 이미 기록됨) 때문에 `AppShell`이 매 링크에 해시를 다시 붙여주는 우회를 쓰고 있다. 여기에 "어느 방인지"까지 해시로 얹으면 더 취약해지므로, **방은 URL 경로 세그먼트로** 둔다 (Next 라우터가 알아서 유지해줌).

- `src/app/page.tsx` → "방 목록" 화면 (새 컴포넌트, 가칭 `RoomFinder`)으로 교체.
- 기존 4개 라우트를 `src/app/r/[roomId]/...` 아래로 이동:
  - `src/app/r/[roomId]/page.tsx` → `<HabitCounter roomId={params.roomId} />`
  - `.../stats/page.tsx`, `.../game/page.tsx`, `.../ranking/page.tsx`, `.../manage/page.tsx` 동일 패턴.
- 해시(`#/이름`)는 그대로 방 **안에서** "누구 페이지를 보는지"용으로 유지 (`useSelectedUser` 변경 없음, 스와이프도 그대로).

## 4. AppShell / 헤더 / 하단바 (`src/components/AppShell.tsx`)

- `usePathname()`으로 `/^\/r\/([^/]+)/` 매치해서 현재 `roomId` 추출 (params가 루트 레이아웃까지 안 내려오므로 이 방식이 필요).
- roomId가 없으면(= `/` 방 목록 화면) 로그인 헤더(로고/AuthMenu/패치노트)만 보여주고 **하단 탭바·햄버거 메뉴는 렌더 안 함**.
- `NAV` 항목 href를 `/r/${roomId}` + suffix로 조립하는 얇은 헬퍼 추가.

## 5. 인증/연결 훅 분리 (`src/lib/useAuth.ts`, `src/components/LinkUser.tsx`)

- `useAuth()`는 **전역 세션 상태**(loading/signedOut/ready, 카카오 닉네임)만 남긴다 — 로그인 게이트용으로 room 무관.
- 새 훅 `useMyRoomUser(roomId)` — 지금 `useAuth`의 `me`/`needsLink` 로직을 그대로 가져오되 `my_user(p_room_id)`를 호출. `HabitCounter`가 이걸 사용.
- `LinkUser`가 `roomId` prop을 받아 `unlinked_users(roomId)`/`create_my_user(roomId, name)`를 호출 — "방 가입"과 "이름 연결"이 동일한 화면.

## 6. 방 목록 화면 (신규 `RoomFinder` 컴포넌트)

- `supabase.from("rooms").select()` (RLS가 내 방만 걸러줌) → 카드 그리드. 새 전용 그리드 컴포넌트(지금 카운터의 `gridSizing()` 동적 로직과는 별개, 훨씬 단순): PC `grid-cols-3`류 고정폭, 모바일 `grid-cols-1`. 카드는 기존 `ItemCard` 룩(둥근 테두리, 큰 텍스트)에서 카운트 자리에 방 이름.
- 카드 클릭 → `router.push('/r/' + room.id)`.
- "+ 코드로 참여" 카드 → 코드 입력 모달 → `join_room_by_lookup` → 해당 방 id로 `LinkUser` 플로우 진입.
- "+ 새 방 만들기" 카드 → 방이름/PIN 입력 모달(지금 `AddItemModal` 패턴 재사용) → `create_room` → 바로 `/r/[새 roomId]`로 이동.

## 7. api.ts / 나머지 컴포넌트에 roomId 꿰기

`src/lib/api.ts`의 방 관련 함수들이 `roomId` 파라미터를 받도록 일괄 수정 (섹션 2의 B그룹과 1:1 대응). `HabitCounter`/`StatsView`/`GameView`/`RankingView`/`ManageView`는 각각 `roomId: string` prop을 받아 자신의 fetch 호출에 그대로 전달 — 컴포넌트 내부 로직(스와이프, 카드 꾸미기, 힘내요, 랭킹 3부문 등)은 그대로 유지, room 인자만 추가.

`ManageView`의 PIN 로컬 캐시 키(`dh_manage_pin`)도 방별로 분리 (`dh_manage_pin:${roomId}`).

## 8. 게임 cron (`src/app/api/cron/tick/route.ts`)

지금은 "오늘 전역 라운드 하나"를 다루는데, 방마다 독립 라운드가 필요하므로 **모든 방을 순회**하도록 바꾼다: `rooms`를 전부 조회 → 방마다 오늘 라운드 있는지 확인/생성 → 시작 시각 지났고 안 쐈으면 그 방 구독자에게만 발송. 로직 자체(멱등, `notified_at` 선점)는 동일하게 방마다 반복.

## 검증

- `npx tsc --noEmit`, `npm run build` — 매 단계 후 확인.
- SQL은 신텍스 실수가 잦았던 만큼(이 프로젝트에서 ambiguous column, drop-before-replace 문제를 겪은 적 있음) **schema.sql을 Supabase SQL Editor에 붙여넣기 전에** `create or replace function`으로 반환 타입이 바뀌는 함수가 없는지, 여러 테이블 join 안에서 room_id/name처럼 겹치는 컬럼명을 unqualified로 쓴 곳이 없는지 한 번 더 정독.
- 로컬 `npm run dev`로: 로그인 → 방 목록(빈 상태) → 새 방 만들기 → 카운터 진입 → 항목 추가/탭 → 다른 브라우저 프로필로 초대코드 참여 → 두 방이 서로의 데이터를 안 보여주는지 확인.
- 마이그레이션 후 기존 프로덕션 데이터가 레거시 방 안에서 그대로 보이는지 (기존 로그인 계정으로) 확인.

---

## 진행 로그

> 새 항목을 추가할 땐 아래 템플릿을 복사해서 이 섹션 맨 위(이 안내 바로 아래)에 붙여넣고 채우세요. 최신 항목이 항상 위로 오게.

### 템플릿
```
### YYYY-MM-DD — <PC/작업자 식별 이름>

**이번에 한 일**
- 

**체크리스트 반영** (위 체크리스트도 같이 갱신하세요)
- [x]/[ ] 

**막히거나 다음에 확인해야 할 것**
- 

**다음 세션이 이어서 할 일**
- 
```

(아직 항목 없음 — 다음 세션에서 여기부터 추가)
