"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EMOJIS, POLL_MS, TEXT } from "@/config";
import { fetchSnapshot, incrementItem, sendCheer, type Row } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useSelectedUser } from "@/lib/useSelectedUser";
import { readableTextColor } from "@/lib/color";
import HmmFace from "@/components/HmmFace";
import CardStyleEditor from "@/components/CardStyleEditor";
import AddItemModal from "@/components/AddItemModal";
import ActorEditModal from "@/components/ActorEditModal";
import LinkUser from "@/components/LinkUser";

const POPUP_MS = 900; // globals.css 의 .hc-pop 지속 시간과 같게
const LONG_PRESS_MS = 2000;
/** 이보다 가로로 많이, 세로보다 더 가로로 움직여야 스와이프로 쳐요. */
const SWIPE_MIN_DX = 60;

/** 한 줄에 최대 이만큼. 아무리 많아도 이보다 넓게는 안 깔아요. */
const MAX_COLUMNS = 5;

/**
 * 카드 수에 따른 한 줄 개수.
 *   2개 → 1줄에 1개 (위아래로)      3개 → 2 + 1        4개 → 2 + 2
 *   5개 → 2 + 2 + 1                 6개 → 3 + 3        7개 → 3 + 3 + 1
 *   8·9개 → 4씩                     10개 이상 → 5씩 (최대)
 * 2개 이하는 한 줄에 하나, 그 위로는 "카드 수의 절반"이에요.
 * 다만 3개는 절반이 1이라 그대로 두면 세로로 늘어서요. 그래서 하한이 2예요.
 */
function columnsFor(count: number): number {
  if (count <= 2) return 1;
  return Math.min(MAX_COLUMNS, Math.max(2, Math.floor(count / 2)));
}

/**
 * 행위자 한 명의 카드를 바둑판처럼 깔아요. 열 수는 columnsFor 가 정해요.
 * 폰에서 5열이면 한 칸이 60px 밖에 안 돼서, 열이 늘수록 글자와 여백을 같이 줄여요.
 * 이름에는 break-keep 과 break-words 를 같이 줘요 — 평소엔 한국어 단어를 안 쪼개되,
 * "주먹권발차기유때림" 처럼 띄어쓰기 없이 긴 말은 칸을 뚫으니 그때만 쪼개라는 뜻이에요.
 * sm 이상은 칸이 넉넉하니 원래 크기로 돌아와요.
 */
function gridSizing(count: number) {
  const columns = columnsFor(count);
  if (columns <= 2) {
    return {
      columns,
      pad: "p-4",
      minHeight: "min-h-[180px] sm:min-h-[200px]",
      nameClass: "break-keep break-words pr-8 text-[15px] leading-snug",
      countClass: "text-5xl",
      // tight: 칸이 좁아서 꾸미기 버튼을 폰에서만 숨겨요. (길게 누르면 그래도 열려요)
      tight: false,
    };
  }
  if (columns === 3) {
    return {
      columns,
      pad: "p-3 sm:p-4",
      minHeight: "min-h-[140px] sm:min-h-[170px]",
      nameClass: "break-keep break-words pr-8 text-[13px] leading-snug sm:text-[15px]",
      countClass: "text-3xl sm:text-4xl",
      tight: false,
    };
  }
  if (columns === 4) {
    return {
      columns,
      pad: "p-2 sm:p-4",
      minHeight: "min-h-[112px] sm:min-h-[160px]",
      nameClass: "break-words text-[11px] leading-tight sm:break-keep sm:pr-8 sm:text-[15px]",
      countClass: "text-base sm:text-4xl",
      tight: true,
    };
  }
  return {
    columns,
    pad: "p-2 sm:p-4",
    minHeight: "min-h-[100px] sm:min-h-[150px]",
    nameClass: "break-words text-[10px] leading-tight sm:break-keep sm:pr-8 sm:text-[15px]",
    countClass: "text-sm sm:text-4xl",
    tight: true,
  };
}

type Pop = { key: number; emoji: string; x: number; y: number };

/** 카드 하나. 롱프레스마다 독립된 타이머가 필요해서 .map() 밖으로 뺀 하위 컴포넌트예요. */
function ItemCard({
  row,
  sizing,
  isMine,
  onIncrement,
  onOpenStyle,
}: {
  row: Row;
  sizing: ReturnType<typeof gridSizing>;
  /** 남의 페이지에서는 카운트도, 카드 꾸미기도 손댈 수 없어요 (서버도 같은 걸 막아요). */
  isMine: boolean;
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
    if (!isMine) return;
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
    if (!isMine) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onIncrement(row, e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMine) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onIncrement(row, e.currentTarget);
    }
  };

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

  return (
    <div
      role={isMine ? "button" : undefined}
      tabIndex={isMine ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      style={cardStyle}
      className={
        "relative flex flex-col justify-between gap-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition sm:gap-3 " +
        (isMine
          ? "cursor-pointer hover:border-neutral-300 active:scale-[0.97] active:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 "
          : "") +
        `${sizing.pad} ${sizing.minHeight}`
      }
    >
      {isMine && (
        <button
          type="button"
          aria-label="카드 꾸미기"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenStyle(row);
          }}
          className={
            "absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/10 text-sm hover:bg-black/20 " +
            (sizing.tight ? "hidden sm:flex" : "flex")
          }
        >
          ⋯
        </button>
      )}

      {/* 행위자 이름은 바로 위 섹션 제목에 있어서 카드 안에는 안 넣어요. */}
      <span className={`min-w-0 font-medium ${sizing.nameClass}`}>{row.name}</span>
      <span className={`font-semibold tabular-nums tracking-tight ${sizing.countClass}`}>
        {row.count.toLocaleString()}
      </span>
    </div>
  );
}

export default function HabitCounter() {
  const { user, selectUser } = useSelectedUser();
  const { status: authStatus, me, displayName } = useAuth();
  const [users, setUsers] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null); // rows 가 누구 것인지
  const [viewedUserId, setViewedUserId] = useState<string | null>(null); // 힘내요 보낼 때 필요해요
  const [cheering, setCheering] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pops, setPops] = useState<Pop[]>([]);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [editingActor, setEditingActor] = useState<{ actor: string; count: number } | null>(null);
  const [addingActor, setAddingActor] = useState<string | null>(null);
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
        setViewedUserId(snap.userId);
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
  // 실제 소유 여부. 힘내요처럼 "진짜 다른 사람인지"가 중요한 곳은 이걸 써요.
  const actuallyMine = authStatus === "ready" && me?.name === current; // 공유 링크로 남의 페이지를 볼 때는 false
  // 로컬 개발 중엔 카카오 로그인 계정과 테스트하려는 사용자가 다를 때가 많아서 구분 자체를 꺼요.
  const isMine = process.env.NODE_ENV !== "production" || actuallyMine;
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

  const applyRename = (id: string, patch: { actor: string; name: string }) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const increment = async (row: Row, el: HTMLElement) => {
    if (!current || !isMine) return; // 서버도 같은 걸 막지만, UI 에서도 한 번 더 막아요.
    spawnPop(el);
    bump(row.id, (n) => n + 1);

    pending.current++;
    try {
      const serverCount = await incrementItem(row.id);
      // 연속 탭이면 이 요청들의 응답이 보낸 순서대로 안 올 수 있어요. 낮은 값으로 먼저 도착한
      // 응답이 나중에 도착한 높은 값을 덮어쓰지 않게 max 로 합쳐요 (동시에 누른 다른 사람 몫도 포함된 값이에요).
      bump(row.id, (n) => Math.max(n, serverCount));
    } catch {
      bump(row.id, (n) => n - 1); // 실패하면 되돌리기
    } finally {
      // 클릭했을 땐 그 항목의 카운트만 바꿔요. 전체를 다시 불러오면(순서·다른 항목 값이
      // 매번 새로 온 배열로 통째로 교체되면서) 화면이 흔들릴 수 있어서, 나머지 동기화는
      // 다음 폴링 주기(POLL_MS)에 맡겨요.
      pending.current--;
    }
  };

  const handleCheer = async () => {
    if (!viewedUserId || cheering) return;
    setCheering(true);
    try {
      await sendCheer(viewedUserId);
      toast.success(TEXT.cheer.sent);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg === "cooldown"
          ? TEXT.cheer.cooldown
          : msg === "self"
            ? TEXT.cheer.self
            : TEXT.cheer.failed
      );
    } finally {
      setCheering(false);
    }
  };

  /* ── 좌우 스와이프로 다른 사람 메인 넘겨보기 ── */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !current || users.length < 2) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const idx = users.indexOf(current);
    if (idx === -1) return;
    const nextIdx = dx < 0 ? (idx + 1) % users.length : (idx - 1 + users.length) % users.length;
    selectUser(users[nextIdx]);
  };

  /* ── 화면 ── */
  return (
    <main
      className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {status === "error" && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {errorMsg || TEXT.errorFetch}
        </p>
      )}

      {/* 로그인했지만 아직 이름을 연결하지 않음 (최초 1회) */}
      {authStatus === "needsLink" && <LinkUser defaultName={displayName} />}

      {/* 로그인 직후, AppShell 이 해시에 이름을 넣어주기 전 */}
      {authStatus === "ready" && !current && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {TEXT.loading}
        </p>
      )}

      {/* 내 화면: 행위자별 버튼들 */}
      {authStatus === "ready" && status === "ready" && current && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{current}</h1>
          {rowsReady && <p className="mt-2 text-neutral-500">{TEXT.totalSuffix(total)}</p>}

          {/* 남의 페이지일 때만: 그 소리들 참느라 고생한다는 의미로 응원 보내기 */}
          {rowsReady && !actuallyMine && viewedUserId && (
            <button
              type="button"
              onClick={handleCheer}
              disabled={cheering}
              className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
            >
              {TEXT.cheer.button}
            </button>
          )}

          {/* 좌우로 넘길 수 있다는 걸 알려주는 점들. 지금 보고 있는 사람이 진하게 표시돼요. */}
          {users.length > 1 && (
            <div className="mt-4 flex gap-1.5">
              {users.map((u) => (
                <span
                  key={u}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (u === current ? "w-4 bg-neutral-900" : "w-1.5 bg-neutral-200")
                  }
                />
              ))}
            </div>
          )}

          {rowsReady && groups.length === 0 && (
            <div className="mt-10 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
              <p>{isMine ? TEXT.emptyUserMine : TEXT.emptyUser}</p>
              {isMine && (
                <button
                  type="button"
                  onClick={() => setAddingActor("")}
                  className="mt-3 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95"
                >
                  {TEXT.addItem.title}
                </button>
              )}
            </div>
          )}

          {groups.map(([actor, items]) => {
            const sizing = gridSizing(items.length);
            return (
              <section key={actor} className="mt-10">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">{actor}</h2>
                    {isMine && (
                      <>
                        <button
                          type="button"
                          aria-label="항목 추가"
                          onClick={() => setAddingActor(actor)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-500 hover:bg-neutral-200"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label={actor + " 수정"}
                          onClick={() => setEditingActor({ actor, count: items.length })}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-500 hover:bg-neutral-200"
                        >
                          ✎
                        </button>
                      </>
                    )}
                  </div>
                  <span className="text-sm tabular-nums text-neutral-400">
                    {items.reduce((s, r) => s + r.count, 0).toLocaleString()}
                  </span>
                </div>
                <div
                  className="mt-4 grid gap-2 sm:gap-4"
                  style={{
                    // minmax(0,1fr) 이어야 긴 행위명이 칸을 밀어내지 않아요.
                    gridTemplateColumns: `repeat(${sizing.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {items.map((row) => (
                    <ItemCard
                      key={row.id}
                      row={row}
                      sizing={sizing}
                      isMine={isMine}
                      onIncrement={increment}
                      onOpenStyle={setEditingRow}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {isMine && groups.length > 0 && (
            <button
              type="button"
              onClick={() => setAddingActor("")}
              className="mt-10 w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 active:scale-[0.99]"
            >
              {TEXT.addItem.addActor}
            </button>
          )}
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
          isMine={isMine}
          onClose={() => setEditingRow(null)}
          onChange={(patch) => {
            applyStyle(editingRow.id, patch);
            setEditingRow((r) => (r ? { ...r, ...patch } : r));
          }}
          onRename={(patch) => {
            applyRename(editingRow.id, patch);
            setEditingRow((r) => (r ? { ...r, ...patch } : r));
          }}
          onDelete={() => {
            removeRow(editingRow.id);
            setEditingRow(null);
          }}
        />
      )}

      {addingActor !== null && (
        <AddItemModal
          actor={addingActor}
          onClose={() => setAddingActor(null)}
          onAdded={() => {
            setAddingActor(null);
            load(userRef.current);
          }}
        />
      )}

      {editingActor && (
        <ActorEditModal
          actor={editingActor.actor}
          itemCount={editingActor.count}
          onClose={() => setEditingActor(null)}
          onDone={() => {
            setEditingActor(null);
            load(userRef.current);
          }}
        />
      )}
    </main>
  );
}
