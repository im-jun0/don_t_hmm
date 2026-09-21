"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, EMOJIS, POLL_MS, TEXT } from "@/config";
import { addCount, fetchSnapshot, type Row } from "@/lib/api";
import HmmFace from "@/components/HmmFace";

const POPUP_MS = 900; // globals.css 의 .hc-pop 지속 시간과 같게

type Pop = { key: number; emoji: string; x: number; y: number };

/** 주소 뒤의 #/이름 에서 선택된 사용자를 읽어요. (새로고침해도, 링크로 공유해도 유지) */
function readHash(): string | null {
  try {
    const v = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
    return v || null;
  } catch {
    return null;
  }
}

export default function HabitCounter() {
  const [users, setUsers] = useState<string[]>([]);
  const [user, setUser] = useState<string | null>(null); // 지금 이 사이트를 쓰는 사람
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null); // rows 가 누구 것인지
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pops, setPops] = useState<Pop[]>([]);
  const pending = useRef(0); // 저장 중인 클릭 수 (폴링이 낙관적 숫자를 덮어쓰지 않게)
  const popKey = useRef(0);
  const userRef = useRef<string | null>(null);

  /* ── 선택된 사용자 (URL 해시와 동기화) ── */
  useEffect(() => {
    const sync = () => setUser(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const selectUser = (name: string | null) => {
    window.location.hash = name ? `/${encodeURIComponent(name)}` : "";
  };

  /* ── 데이터 불러오기 ── */
  const load = useCallback(async (target: string | null) => {
    if (pending.current > 0) return;
    if (!API_URL) {
      setErrorMsg(TEXT.errorNoUrl);
      setStatus("error");
      return;
    }
    try {
      const snap = await fetchSnapshot(target);
      setUsers(snap.users);
      // 응답이 오는 사이 다른 사용자로 바뀌었으면 rows 는 버려요
      if (snap.rows && userRef.current === target) {
        setRows(snap.rows);
        setRowsFor(target);
      }
      setStatus("ready");
    } catch (e) {
      setStatus((s) => {
        if (s === "loading") {
          setErrorMsg(e instanceof Error && e.message ? e.message : TEXT.errorFetch);
          return "error";
        }
        return s;
      });
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
    load(user);
    const t = setInterval(() => load(user), POLL_MS);
    return () => clearInterval(t);
  }, [user, load]);

  /* ── 파생 데이터 ── */
  const current = user && users.includes(user) ? user : null;
  const myRows = useMemo(() => (rowsFor === current ? rows : []), [rows, rowsFor, current]);
  const rowsReady = current !== null && rowsFor === current;
  const total = myRows.reduce((sum, r) => sum + r.count, 0);

  // 행위자별로 묶기 (시트에 처음 나온 순서 유지)
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    myRows.forEach((r) => {
      if (!map.has(r.actor)) map.set(r.actor, []);
      map.get(r.actor)!.push(r);
    });
    return [...map];
  }, [myRows]);

  /* ── 클릭 ── */
  const spawnPop = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const pop: Pop = {
      key: popKey.current++,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.4,
      y: r.top + r.height * 0.3,
    };
    setPops((p) => [...p, pop]);
    setTimeout(() => setPops((p) => p.filter((x) => x.key !== pop.key)), POPUP_MS);
  };

  const bump = (id: number, fn: (n: number) => number) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, count: fn(r.count) } : r)));

  const increment = async (row: Row, el: HTMLElement) => {
    if (!current) return;
    spawnPop(el);
    bump(row.id, (n) => n + 1);

    pending.current++;
    try {
      const serverCount = await addCount(current, row.id);
      bump(row.id, () => serverCount); // 동시에 누른 다른 사람 몫까지 반영된 최종 숫자
    } catch {
      bump(row.id, (n) => n - 1); // 실패하면 되돌리기
    } finally {
      pending.current--;
      if (pending.current === 0) load(userRef.current);
    }
  };

  /* ── 화면 ── */
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* 상단: 제목 + 사용자 선택 */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 pt-3">
          <button
            type="button"
            onClick={() => selectUser(null)}
            className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight"
          >
            <HmmFace size={22} />
            {TEXT.appTitle}
          </button>
        </div>
        <nav
          aria-label="사용자 선택"
          className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 pb-3 pt-2"
        >
          {status === "loading" && (
            <span className="py-1.5 text-sm text-neutral-400">{TEXT.loading}</span>
          )}
          {users.map((name) => {
            const on = name === current;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => selectUser(name)}
                className={
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 " +
                  (on
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")
                }
              >
                {name}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
        {status === "error" && (
          <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
            {errorMsg || TEXT.errorFetch}
          </p>
        )}

        {status === "ready" && users.length === 0 && (
          <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
            {TEXT.emptyAll}
          </p>
        )}

        {/* 아직 선택 전 */}
        {status === "ready" && users.length > 0 && !current && (
          <>
            <HmmFace size={104} className="mb-6 text-neutral-900" />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TEXT.pickTitle}</h1>
            <p className="mt-2 text-neutral-500">{TEXT.pickHint}</p>
          </>
        )}

        {/* 선택 후: 내 시트의 행위자별 버튼들 */}
        {status === "ready" && current && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{current}</h1>
            {rowsReady && <p className="mt-2 text-neutral-500">{TEXT.totalSuffix(total)}</p>}

            {rowsReady && groups.length === 0 && (
              <p className="mt-10 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
                {TEXT.emptyUser}
              </p>
            )}

            {groups.map(([actor, items]) => (
              <section key={actor} className="mt-10">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">{actor}</h2>
                  <span className="text-sm tabular-nums text-neutral-400">
                    {items.reduce((s, r) => s + r.count, 0).toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:gap-4">
                  {items.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={(e) => increment(row, e.currentTarget)}
                      className="flex min-h-[148px] flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 active:scale-[0.97] active:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                    >
                      <span className="flex flex-col items-start gap-2">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                          {row.actor}
                        </span>
                        <span className="break-keep text-[15px] font-medium leading-snug">
                          {row.name}
                        </span>
                      </span>
                      <span className="text-4xl font-semibold tabular-nums tracking-tight">
                        {row.count.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      {/* 이모지 팝업 */}
      {pops.map((p) => (
        <span
          key={p.key}
          aria-hidden
          className="hc-pop pointer-events-none fixed z-50 text-4xl"
          style={{ left: p.x, top: p.y }}
        >
          {p.emoji}
        </span>
      ))}
    </main>
  );
}
