"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMOJIS, POLL_MS, TEXT } from "@/config";
import { fetchSnapshot, incrementItem, type Row } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";
import { readableTextColor } from "@/lib/color";
import HmmFace from "@/components/HmmFace";
import CardStyleEditor from "@/components/CardStyleEditor";

const POPUP_MS = 900; // globals.css 의 .hc-pop 지속 시간과 같게
const LONG_PRESS_MS = 2000;

type Pop = { key: number; emoji: string; x: number; y: number };

/** 카드 하나. 롱프레스마다 독립된 타이머가 필요해서 .map() 밖으로 뺀 하위 컴포넌트예요. */
function ItemCard({
  row,
  onIncrement,
  onOpenStyle,
}: {
  row: Row;
  onIncrement: (row: Row, el: HTMLElement) => void;
  onOpenStyle: (row: Row) => void;
}) {
  const pressTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    startPos.current = null;
  };

  const startPress = (x: number, y: number) => {
    cancelPress();
    startPos.current = { x, y };
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      onOpenStyle(row);
    }, LONG_PRESS_MS);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return; // 우클릭 등은 무시
    startPress(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > 10) cancelPress(); // 스크롤/드래그로 판단되면 롱프레스 취소
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    cancelPress();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onIncrement(row, e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onIncrement(row, e.currentTarget);
    }
  };

  const hasCustomStyle = Boolean(row.backgroundColor || row.backgroundImageUrl);
  const cardStyle: React.CSSProperties = row.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.55)), url(${row.backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#fff",
        borderColor: "transparent",
      }
    : row.backgroundColor
      ? {
          backgroundColor: row.backgroundColor,
          color: readableTextColor(row.backgroundColor),
          borderColor: "transparent",
        }
      : {};
  const badgeClass = hasCustomStyle
    ? "rounded-full bg-black/15 px-2.5 py-0.5 text-xs font-medium"
    : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      style={cardStyle}
      className="relative flex min-h-[148px] cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 active:scale-[0.97] active:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      <button
        type="button"
        aria-label="카드 꾸미기"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onOpenStyle(row);
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-sm hover:bg-black/20"
      >
        ⋯
      </button>

      <span className="flex flex-col items-start gap-2">
        <span className={badgeClass}>{row.actor}</span>
        <span className="break-keep text-[15px] font-medium leading-snug">{row.name}</span>
      </span>
      <span className="text-4xl font-semibold tabular-nums tracking-tight">
        {row.count.toLocaleString()}
      </span>
    </div>
  );
}

export default function HabitCounter() {
  const { user } = useSelectedUser();
  const [users, setUsers] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null); // rows 가 누구 것인지
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pops, setPops] = useState<Pop[]>([]);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const pending = useRef(0); // 저장 중인 클릭 수 (폴링이 낙관적 숫자를 덮어쓰지 않게)
  const popKey = useRef(0);
  const userRef = useRef<string | null>(null);

  /* ── 데이터 불러오기 ── */
  const load = useCallback(async (target: string | null) => {
    if (pending.current > 0) return;
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

  // 행위자별로 묶기 (처음 나온 순서 유지)
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

  const bump = (id: string, fn: (n: number) => number) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, count: fn(r.count) } : r)));

  const applyStyle = (id: string, patch: { backgroundColor: string | null; backgroundImageUrl: string | null }) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const increment = async (row: Row, el: HTMLElement) => {
    if (!current) return;
    spawnPop(el);
    bump(row.id, (n) => n + 1);

    pending.current++;
    try {
      const serverCount = await incrementItem(row.id);
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
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
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

      {/* 선택 후: 행위자별 버튼들 */}
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
                  <ItemCard key={row.id} row={row} onIncrement={increment} onOpenStyle={setEditingRow} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

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

      {editingRow && (
        <CardStyleEditor
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onChange={(patch) => {
            applyStyle(editingRow.id, patch);
            setEditingRow((r) => (r ? { ...r, ...patch } : r));
          }}
        />
      )}
    </main>
  );
}
