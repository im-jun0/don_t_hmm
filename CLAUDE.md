# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"don't hmm" — a Next.js 15 (App Router) + Tailwind web app backed by Supabase (Postgres). It's a counter UI: pick a person from the top nav, and buttons appear for logging annoying behaviors of others ("actors"), incrementing a count each tap. Three pages: 메인 (counter, `/`), 현황 (charts, `/stats`), 항목관리 (PIN-gated admin, `/manage`). Deployed to Vercel; the main counter has no login, link-sharing only.

All UI copy, emoji list, poll interval, nav labels, and patch notes live in `src/config.ts` — check there before assuming something needs a code change.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

No lint or test scripts are configured in `package.json`. There is no test suite.

Local env: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project (Settings → API). Without them, the app shows `TEXT.errorNoUrl`. `SUPABASE_SECRET_KEY` is only needed for the one-time `scripts/migrate-from-sheets.mjs` — never expose it as `NEXT_PUBLIC_*`.

## Architecture

### Database — `supabase/schema.sql`

Not applied by any tooling in this repo — it's pasted into the Supabase SQL Editor by hand (edit the file, paste, run; re-run after edits). Tables: `users` (one row = one person using the site, formerly a sheet tab), `items` (their actor/name/count rows, formerly sheet rows), `events` (one row per click, powers the `/stats` line chart), `app_config` (holds the `admin_pin` used by `/manage`).

RLS is on for all four tables. `users`/`items` allow anon `select` only — no write policies exist, so all mutation goes through `security definer` RPC functions: `increment_item` (public, no PIN — the main counter), and `admin_verify_pin` / `admin_upsert_user` / `admin_delete_user` / `admin_upsert_item` / `admin_delete_item` (each takes `p_pin` and calls an internal `check_pin_()` helper that raises if it doesn't match `app_config.admin_pin`). This means the PIN is enforced in the database, not just the UI — a leaked `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` alone can't mutate data. `daily_counts(p_user_id, p_days)` aggregates `events` per day (KST) for the stats line chart.

### Frontend — `src/`

- `src/lib/supabase.ts` — the single `createClient` instance, built from `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `src/lib/api.ts` — the only place that calls Supabase. Wraps table selects and every RPC listed above. `Row.id`/`UserRow.id` are Postgres UUIDs (strings), not the old sheet row-number ids.
- `src/lib/useSelectedUser.ts` — the selected user lives in the URL hash (`#/이름`), not React state or a context. `HabitCounter`, `StatsView`, `ManageView`, and `AppShell` each call this hook independently and stay in sync via the `hashchange` event — this is why there's no shared state provider for "current user."
- `src/components/AppShell.tsx` — rendered once in `src/app/layout.tsx`, wraps every page. Owns the header (title, user chips, patch-notes bell, desktop hamburger) and the mobile bottom tab bar. Polls the users list independently of whatever the page component polls.
- `src/components/HabitCounter.tsx` (`/`), `StatsView.tsx` (`/stats`), `ManageView.tsx` (`/manage`) — one per route, each does its own data fetching/polling.
- `src/components/PatchNotes.tsx` — reads `PATCH_NOTES`/`CURRENT_VERSION` from `src/config.ts`; compares against `localStorage` to auto-open once per new version and show a header badge.
- `src/config.ts` — single source of truth for poll interval, emoji list, nav items, all display strings (`TEXT`), and `PATCH_NOTES` (prepend new entries here when shipping a feature).

**CSS trap already hit once:** the header in `AppShell.tsx` has `backdrop-blur`, which creates a new containing block for `position: fixed` descendants (same as `transform`/`filter`). Any `fixed` element rendered *inside* the header (a modal, an outside-click overlay) will size itself to the header's box instead of the viewport. `PatchNotes`'s modal works around this with `createPortal(..., document.body)`; the hamburger dropdown avoids it by using a `document.addEventListener("mousedown", ...)` outside-click listener instead of a fixed overlay `<div>`. Keep using one of these two patterns for anything new nested in the header.

### Patterns carried over from the counter logic

- Optimistic increment in `HabitCounter`: bump local count immediately, call `increment_item`, reconcile with the server's authoritative count (handles concurrent taps from other people), roll back on failure. A `pending` ref count suppresses the poll loop from clobbering in-flight optimistic state.
- Rows are grouped by `actor` client-side for rendering, preserving fetch order.

### Migration (historical)

`scripts/migrate-from-sheets.mjs` was a one-time script that copied data from the old Google Apps Script backend (`apps-script/Code.gs`, since removed) into Supabase using the secret key to bypass RLS. It's now non-functional (no source to migrate from) but left in place as a record of the migration shape.

## Conventions

- Comments and user-facing strings in this codebase are Korean; match that when editing existing files.
- No global state management library — page/user selection state is local `useState`/`useRef` plus the URL-hash pattern above, by design.
