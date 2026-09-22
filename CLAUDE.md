# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"don't hmm" — a Next.js 15 (App Router) + Tailwind web app backed by Supabase (Postgres). It's a counter UI: sign in with Kakao and buttons appear for logging annoying behaviors of others ("actors"), incrementing a count each tap. Four pages: 메인 (counter, `/`), 현황 (charts, `/stats`), 게임 (30-second minigame, `/game`), 랭킹 (two cumulative leaderboards, `/ranking`), 관리 (PIN-gated admin, `/manage`), plus `/auth/callback` (OAuth code exchange only) and `/api/cron/tick` (the only server-side route). **The whole site sits behind Kakao login** — `AppShell` renders `LoginScreen` instead of the shell when signed out, so `/manage` now needs login *and* the PIN. Deployed to Vercel.

All UI copy, emoji list, poll interval, nav labels, and patch notes live in `src/config.ts` — check there before assuming something needs a code change.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

No lint or test scripts are configured in `package.json`. There is no test suite.

Local env: copy `.env.example` to `.env.local`. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Settings → API) are required or the app shows `TEXT.errorNoUrl`; `NEXT_PUBLIC_KAKAO_REST_API_KEY` / `KAKAO_CLIENT_SECRET` are required to sign in at all. `SUPABASE_SECRET_KEY`, the `VAPID_*` pair and `CRON_SECRET` are only read by `/api/cron/tick` (and the historical migrate script) — never expose any of them as `NEXT_PUBLIC_*` except the VAPID *public* key. README §2 and §4 walk through obtaining each.

## Architecture

### Database — `supabase/schema.sql`

Not applied by any tooling in this repo — it's pasted into the Supabase SQL Editor by hand (edit the file, paste, run; re-run after edits). Tables: `users` (one row = one person using the site, formerly a sheet tab), `items` (their actor/name/count rows, formerly sheet rows), `events` (one row per click, powers the `/stats` line chart), `app_config` (holds the `admin_pin` used by `/manage`).

**Kakao sign-in deliberately does NOT use `supabase.auth.signInWithOAuth`.** GoTrue hardcodes the Kakao scopes as `account_email, profile_image, profile_nickname`, and `options.scopes` only *appends* to that list — it can shrink nothing. `account_email` is a biz-app-only consent item, so on an individual developer account that path dies at Kakao with `KOE205: 설정하지 않은 동의 항목: account_email`, and no client-side change can fix it.

Instead the app runs the authorization itself with `scope=openid profile_nickname` (`signInWithKakao` in `src/lib/api.ts`), exchanges the code for an `id_token` server-side in `src/app/api/auth/kakao/route.ts` (the client secret can't live in the browser), and hands only that token to `supabase.auth.signInWithIdToken({ provider: "kakao" })`. Supabase just verifies the token and never calls Kakao itself, so the hardcoded scopes never apply. Consequences to keep in mind:

- **Kakao's Redirect URI must point at this app** (`/auth/callback`), not at `…supabase.co/auth/v1/callback`.
- **OpenID Connect must be ON** in the Kakao console, or no `id_token` is issued and login fails.
- The Kakao provider still has to be *enabled* in the Supabase dashboard with the same REST API key as Client ID — `signInWithIdToken` validates the token's `aud` against it — plus **Allow users without an email**, since no email will ever arrive.
- `nonce` is intentionally not sent: it's optional for Kakao, and omitting it avoids GoTrue nonce-matching differences. CSRF is covered by the `state` value in `sessionStorage`.
- The app never reads an email anywhere; `useAuth` uses `name`/`preferred_username` only. `users.auth_user_id` links one `auth.users` row to one `users` row; `my_user()` / `unlinked_users()` / `claim_user()` / `create_my_user()` (granted to `authenticated` only) handle the one-time linking. **Every grant must list both `anon` and `authenticated`** — signing in switches the Postgres role, so an `anon`-only grant breaks the app for logged-in users.

RLS is on for all four tables. `users`/`items` allow anon `select` only — no write policies exist, so all mutation goes through `security definer` RPC functions: `increment_item` (public, no PIN — the main counter), and `admin_verify_pin` / `admin_upsert_user` / `admin_delete_user` / `admin_upsert_item` / `admin_delete_item` (each takes `p_pin` and calls an internal `check_pin_()` helper that raises if it doesn't match `app_config.admin_pin`). This means the PIN is enforced in the database, not just the UI — a leaked `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` alone can't mutate data. `daily_counts(p_user_id, p_days)` aggregates `events` per day (KST) for the stats line chart.

### Frontend — `src/`

- `src/lib/supabase.ts` — the single `createClient` instance, built from `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `detectSessionInUrl: false` is set **on purpose**: the URL hash belongs to the `#/이름` user selection, so Supabase must not go looking for tokens there. `src/app/auth/callback/page.tsx` establishes the session by hand instead.
- `src/lib/api.ts` — the only place that calls Supabase. Wraps table selects and every RPC listed above. `Row.id`/`UserRow.id` are Postgres UUIDs (strings), not the old sheet row-number ids.
- `src/lib/useSelectedUser.ts` — the selected user lives in the URL hash (`#/이름`), not React state or a context. Page components call this hook independently and sync via `hashchange` — this is why there's no shared state provider for "current user." **`usePathname()` must stay in the effect's deps.** Next.js navigates with the History API, which drops the hash *without* firing `hashchange`; `AppShell`'s long-lived instance then holds a name that is no longer in the URL, its "refill the hash" effect sees a truthy `user` and does nothing, and every freshly mounted page reads an empty hash and renders as if nobody is signed in. `AppShell` also appends the current hash to each nav `<Link>` so it survives the jump in the first place.
- `src/lib/useAuth.ts` — `{ status, me, displayName }` where status is `loading | signedOut | needsLink | ready`. **Kakao login did not replace the hash mechanism — it feeds it:** `AppShell` writes the signed-in user's name into the hash when the hash is empty, so the page components keep reading the hash exactly as before. It only fills an *empty* hash, because `/manage` legitimately sets the hash to someone else. Like `useSelectedUser`, it's called independently per component and syncs via a window event (`notifyAuthChanged()`, fired after linking). The `onAuthStateChange` callback only stores the session — calling another supabase method inside it can deadlock.
- `src/components/AppShell.tsx` — rendered once in `src/app/layout.tsx`, wraps every page. Owns the header (title, signed-in name + logout, patch-notes bell, desktop hamburger) and the mobile bottom tab bar, gates the whole site behind login, and keeps the `#/이름` hash filled. `/auth/callback` is exempt from the gate — it is mid-sign-in.
- `src/components/HabitCounter.tsx` (`/`), `StatsView.tsx` (`/stats`), `GameView.tsx` (`/game`), `RankingView.tsx` (`/ranking`), `ManageView.tsx` (`/manage`) — one per route, each does its own data fetching/polling.
- `src/components/AuthMenu.tsx` (header login/logout, presentational — `AppShell` owns the auth state), `src/components/LinkUser.tsx` (the one-time name-linking screen, rendered by `HabitCounter` when status is `needsLink`).
- `src/components/PatchNotes.tsx` — reads `PATCH_NOTES`/`CURRENT_VERSION` from `src/config.ts`; compares against `localStorage` to auto-open once per new version and show a header badge.
- `src/config.ts` — single source of truth for poll interval, emoji list, nav items, all display strings (`TEXT`), and `PATCH_NOTES` (prepend new entries here when shipping a feature).

**CSS trap already hit once:** the header in `AppShell.tsx` has `backdrop-blur`, which creates a new containing block for `position: fixed` descendants (same as `transform`/`filter`). Any `fixed` element rendered *inside* the header (a modal, an outside-click overlay) will size itself to the header's box instead of the viewport. `PatchNotes`'s modal works around this with `createPortal(..., document.body)`; the hamburger dropdown avoids it by using a `document.addEventListener("mousedown", ...)` outside-click listener instead of a fixed overlay `<div>`. Keep using one of these two patterns for anything new nested in the header.

### Patterns carried over from the counter logic

- Optimistic increment in `HabitCounter`: bump local count immediately, call `increment_item`, reconcile with the server's authoritative count (handles concurrent taps from other people), roll back on failure. A `pending` ref count suppresses the poll loop from clobbering in-flight optimistic state.
- Rows are grouped by `actor` client-side for rendering, preserving fetch order.

### Rankings (`/ranking`)

Two awards, both **most-first** and both sarcastic, same as the minigame: **가장 부지런한 동료를 둔 친구** (sum of `items.count` per user, `total_leaderboard()`) and **목표 지향적인 동료를 둔 친구** (cumulative minigame taps, reusing `game_leaderboard()`). A high score means your colleagues were noisy, not that you did well — keep the copy ironic.

`RankList` is shared by this page and the game's per-round ranking. Its `titles` prop is off here on purpose: the ranking page already names each award in the section heading, so per-row titles would double up. The game's round ranking passes `titles`.

`Fanfare` fires once on mount when `is_me` lands in the top `FANFARE_RANK` of *either* board (the better rank wins; it never fires twice). The sound is synthesized with `OscillatorNode` rather than shipping an audio asset, and the whole thing is wrapped in try/catch — **if audio is blocked the confetti must still run.** Arriving via a nav tap carries user activation so the sound plays; a cold load straight to `/ranking` may be silent. Confetti is portalled to `document.body` (the header's `backdrop-blur` traps `fixed`) and hidden under `prefers-reduced-motion`.

### The minigame (`/game`)

One round per day at a random time inside `GAME.windowStartHour..windowEndHour` (KST), 30 seconds long. Tables: `game_rounds` (one row per `round_date`, unique), `game_scores` (`(round_id, user_id)` PK), `push_subscriptions`. All three have RLS on with **no policies at all** — reachable only through the `security definer` RPCs (`game_state` / `game_tap` / `game_ranking` / `game_leaderboard` / `save_push_subscription` / `delete_push_subscription`, granted to `authenticated`) or with the secret key from the cron route.

- `game_state()` deliberately returns `null` for `ends_at` while a round is `waiting` — not knowing when it fires is the whole point of the game. It also returns `now()` so the client can correct for a skewed device clock instead of trusting `Date.now()`.
- `game_tap()` re-checks that the round is live in SQL, so a tap arriving after the timer is rejected server-side, not just hidden in the UI.
- **Ranking is most-taps-first and every title is sarcastic.** 1st place gets "가장 성실한 동료를 둔 친구" — you tapped the most, meaning your colleagues were the loudest. Titles live in `RANK_TITLES` / `LAST_RANK_TITLE` in `src/config.ts`. Do not "fix" the direction; it reads backwards on purpose.

`src/app/api/cron/tick/route.ts` is the only server-side code in the repo (Node runtime, `CRON_SECRET` bearer, secret key). It is **idempotent by design** so the driving scheduler can tick at any interval: create today's round if missing, send the push if `start_at` has passed and `notified_at` is null, otherwise do nothing. It stamps `notified_at` *before* sending, via a conditional update on `is null`, so overlapping ticks cannot double-send. KST boundaries are computed with an explicit +9h offset because the server runs on UTC. `vercel.json` drives it every 5 minutes — but Vercel Hobby caps cron at once per day, so README §4-2 documents Supabase `pg_cron` + `pg_net` as the alternative.

Web push lives in `public/sw.js`, `public/manifest.json`, and `src/lib/push.ts`. iOS only allows push from a home-screen-installed PWA, which is why `pushSupported()` can be false on an iPhone in plain Safari and `TEXT.game.pushUnsupported` spells out the 홈 화면에 추가 step.

### Migration (historical)

`scripts/migrate-from-sheets.mjs` was a one-time script that copied data from the old Google Apps Script backend (`apps-script/Code.gs`, since removed) into Supabase using the secret key to bypass RLS. It's now non-functional (no source to migrate from) but left in place as a record of the migration shape.

## Conventions

- Comments and user-facing strings in this codebase are Korean; match that when editing existing files.
- No global state management library — page/user selection state is local `useState`/`useRef` plus the URL-hash pattern above, by design.

LLM의 일반적인 코딩 실수를 줄이기 위한 행동 지침이다. 프로젝트별 지침이 있을 경우 본 가이드라인과 병합하여 사용한다.

트레이드오프: 본 지침은 속도보다 신중함에 우선순위를 둔다. 사소한 작업은 상황에 맞게 판단한다.

### 1. 구현 전 사고 (Think Before Coding)
가정하지 않는다. 모호함을 숨기지 않는다. 트레이드오프를 명확히 밝힌다.

구현을 시작하기 전 다음을 준수한다:

- 자신의 가정을 명시적으로 기술한다. 불확실한 경우 질문한다.

- 해석의 여지가 여러 가지라면 임의로 선택하지 말고 대안들을 제시한다.

- 더 간단한 접근 방식이 있다면 제안한다. 정당한 사유가 있다면 사용자의 요청에 반대 의견을 제시한다.

- 불분명한 부분이 있다면 작업을 중단한다. 혼란스러운 부분을 구체적으로 언급하며 질문한다.

### 2. 단순성 우선 (Simplicity First)
- 문제를 해결하는 최소한의 코드만 작성한다. 추측에 기반한 코드는 배제한다.

- 요청되지 않은 기능은 추가하지 않는다.

- 일회성 코드를 위해 추상화 계층을 만들지 않는다.

- 요청되지 않은 유연성이나 설정 가능성을 고려하지 않는다.

- 발생 불가능한 시나리오에 대한 예외 처리를 하지 않는다.

- 200줄의 코드를 50줄로 줄일 수 있다면 코드를 다시 작성한다.

- "시니어 엔지니어가 보기에 이 코드가 지나치게 복잡한가?"라고 자문한다. 그렇다면 단순화한다.

### 3. 정밀한 수정 (Surgical Changes)
필요한 부분만 수정한다. 본인이 만든 코드의 뒷정리만 수행한다.

기존 코드를 편집할 때 다음을 준수한다:

- 인접한 코드, 주석, 포맷을 임의로 개선하지 않는다.
- 망가지지 않은 부분을 리팩토링하지 않는다.
- 본인의 스타일과 다르더라도 기존 스타일을 따른다.
- 작업과 무관한 데드 코드를 발견하면 보고하되 직접 삭제하지 않는다.

수정으로 인해 사용되지 않게 된 요소가 발생할 경우:

- 본인의 수정으로 인해 불필요해진 임포트, 변수, 함수는 제거한다.
- 기존에 존재하던 데드 코드는 요청이 없는 한 그대로 둔다.
- 테스트 기준: 변경된 모든 라인은 사용자의 요청사항과 직접적으로 연결되어야 한다.

### 4. 목표 중심 실행 (Goal-Driven Execution)
성공 기준을 정의한다. 검증될 때까지 반복한다.
작업을 검증 가능한 목표로 변환한다:

- "유효성 검사 추가" → "잘못된 입력에 대한 테스트 작성 후 통과 확인"
- "버그 수정" → "버그를 재현하는 테스트 작성 후 통과 확인"
- "X 리팩토링" → "리팩토링 전후의 테스트 통과 확인"

다단계 작업의 경우 간략한 계획을 수립한다:

1. [단계] → 검증: [확인 사항]
2. [단계] → 검증: [확인 사항]
3. [단계] → 검증: [확인 사항]
   성공 기준이 명확해야 독립적인 작업이 가능하다. "작동하게 만들기"와 같은 모호한 기준은 불필요한 재질의를 야기한다.

지침 작동 확인: Diff 내 불필요한 변경 감소, 복잡성으로 인한 재작성 빈도 감소, 구현 전 질문을 통한 명확한 의사결정 증대.
