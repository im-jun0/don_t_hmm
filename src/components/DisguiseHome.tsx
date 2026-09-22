"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISGUISE_APP_NAMES, POLL_MS, TEXT } from "@/config";
import { fetchSnapshot, incrementItem, type Row } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";
import { DECOY_APPS, DecoyIcon, type DecoyApp } from "@/components/DisguiseIcons";

/**
 * 위장 테마. 아이폰 홈 화면처럼 보이게 깔아요.
 *
 * 진짜 항목만 덜렁 올려두면 화면이 휑해서 티가 나요. 그래서 들러리 앱으로 화면을 채우고
 * 진짜 항목을 그 사이에 흩어 놓아요. 카운트는 아이콘 위 빨간 뱃지로 나오고,
 * 눌러도 이모지가 안 튀어요 — 튀면 위장이 그 자리에서 깨지니까요.
 * 독 맨 오른쪽 설정으로 원래 테마로 돌아와요.
 */

const ICON = 60;
const COLUMNS = 4;
/** 최소 이만큼은 깔아요. 진짜 항목이 많으면 그만큼 늘어나요. */
const MIN_SLOTS = 24;
const DOCK_KEYS = ["phone", "safari", "messages"];

/**
 * 그리드에 깔 들러리. 독에 있는 앱과 설정은 빼요 —
 * 진짜 아이폰은 같은 앱이 독과 홈 화면에 동시에 있을 수 없어서 그대로 두면 티가 나요.
 */
const GRID_DECOYS = DECOY_APPS.filter(
  (a) => !DOCK_KEYS.includes(a.key) && a.key !== "settings"
);

/** 항목 순서대로 가짜 앱 이름을 붙여요. 모자라면 앞에서부터 다시 써요. */
function appName(index: number): string {
  return DISGUISE_APP_NAMES[index % DISGUISE_APP_NAMES.length];
}

/**
 * 진짜 항목을 놓을 자리를 정해요.
 * 화면 전체에 고르게 벌린 뒤 i%3 만큼만 어긋나게 밀어요 —
 * 딱 맞게 줄을 세우면 그것대로 규칙이 보이고, 뭉쳐 있으면 한눈에 티가 나거든요.
 * 계산이 고정이라 새로고침해도 자리가 안 바뀌어요. 매번 옮겨 다니는 게 제일 수상하니까요.
 */
function scatterSlots(count: number, total: number): number[] {
  if (count === 0) return [];
  const gap = total / count;
  const used = new Set<number>();
  return Array.from({ length: count }, (_, i) => {
    let slot = Math.round(i * gap + (i % 3)) % total;
    while (used.has(slot)) slot = (slot + 1) % total;
    used.add(slot);
    return slot;
  });
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#ff3b30] px-1.5 text-[11px] font-semibold leading-none text-white ring-2 ring-black/5">
      {count > 999 ? "999+" : count}
    </span>
  );
}

/** 진짜 항목 아이콘. 올려둔 이미지가 있으면 그대로, 없으면 색 타일로 대신해요. */
function ItemIcon({ row }: { row: Row }) {
  if (row.backgroundImageUrl) {
    return (
      <span
        className="block rounded-[22%] bg-cover bg-center shadow-sm ring-1 ring-black/10"
        style={{ width: ICON, height: ICON, backgroundImage: `url(${row.backgroundImageUrl})` }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-[22%] text-xl font-semibold text-black/45 shadow-sm ring-1 ring-black/10"
      style={{
        width: ICON,
        height: ICON,
        background: row.backgroundColor ?? "linear-gradient(180deg,#fdfdfd,#dcdce1)",
      }}
    >
      {row.name.trim().slice(0, 1)}
    </span>
  );
}

function Tile({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 transition active:scale-95"
    >
      <span className="relative">{children}</span>
      <span className="w-full truncate text-center text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        {label}
      </span>
    </button>
  );
}

function StatusBar() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        })
      );
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center justify-between px-7 pt-3 text-[15px] font-semibold text-white">
      <span className="tabular-nums">{now}</span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
          <rect x="4.6" y="5.5" width="3" height="5.5" rx="1" />
          <rect x="9.2" y="3" width="3" height="8" rx="1" />
          <rect x="13.8" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M1 4.2a10.5 10.5 0 0 1 14 0M3.7 7a6.6 6.6 0 0 1 8.6 0" />
          <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
          <rect x="0.6" y="0.6" width="20" height="10.8" rx="3" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="2.2" y="2.2" width="15.5" height="7.6" rx="1.8" fill="currentColor" />
          <path d="M22.4 4.2v3.6a2 2 0 0 0 0-3.6z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

export default function DisguiseHome({ onExit }: { onExit: () => void }) {
  const { user } = useSelectedUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef(0); // 저장 중인 탭 수 (폴링이 낙관적 숫자를 덮어쓰지 않게)

  const load = useCallback(async (target: string | null) => {
    if (pending.current > 0) return;
    try {
      const snap = await fetchSnapshot(target);
      if (snap.rows) setRows(snap.rows);
    } catch {
      /* 폴링이라 다음 차례에 다시 시도해요 */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load(user);
    const t = setInterval(() => load(user), POLL_MS);
    return () => clearInterval(t);
  }, [user, load]);

  const bump = (id: string, fn: (n: number) => number) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, count: fn(r.count) } : r)));

  const tap = async (row: Row) => {
    bump(row.id, (n) => n + 1);
    pending.current++;
    try {
      const serverCount = await incrementItem(row.id);
      bump(row.id, () => serverCount);
    } catch {
      bump(row.id, (n) => n - 1);
    } finally {
      pending.current--;
    }
  };

  /** 자리마다 진짜 항목이 올지 들러리가 올지 미리 정해둬요. */
  const slots = useMemo(() => {
    const wanted = Math.max(MIN_SLOTS, Math.ceil((rows.length + 10) / COLUMNS) * COLUMNS);
    // 들러리는 한 종류씩만 써요. 모자라면 화면을 덜 채우는 게 나아요 —
    // 같은 앱이 두 번 보이는 순간 위장이 깨지니까요. (마지막 줄이 덜 차는 건 자연스러워요)
    const total = Math.min(wanted, rows.length + GRID_DECOYS.length);

    const placed = scatterSlots(rows.length, total);
    const bySlot = new Map<number, { row: Row; index: number }>();
    placed.forEach((slot, i) => bySlot.set(slot, { row: rows[i], index: i }));

    let decoyAt = 0;
    return Array.from({ length: total }, (_, slot) => {
      const real = bySlot.get(slot);
      if (real) return { kind: "real" as const, ...real };
      const decoy: DecoyApp = GRID_DECOYS[decoyAt++];
      return { kind: "decoy" as const, decoy };
    });
  }, [rows]);

  const dock = DOCK_KEYS.map((k) => DECOY_APPS.find((a) => a.key === k)).filter(
    (a): a is DecoyApp => Boolean(a)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        background: "linear-gradient(165deg,#3f4c6b 0%,#5c6b8a 35%,#8a7f9c 70%,#c2a3a8 100%)",
      }}
    >
      <StatusBar />

      <div className="flex-1 px-6 pb-3 pt-7">
        {loaded && rows.length === 0 && (
          <p className="mb-5 text-center text-[11px] text-white/45">{TEXT.disguise.empty}</p>
        )}

        <div className="grid grid-cols-4 gap-x-4 gap-y-[22px]">
          {slots.map((slot, i) =>
            slot.kind === "real" ? (
              <Tile key={slot.row.id} label={appName(slot.index)} onClick={() => tap(slot.row)}>
                <ItemIcon row={slot.row} />
                <Badge count={slot.row.count} />
              </Tile>
            ) : (
              <Tile key={`decoy-${i}`} label={slot.decoy.label}>
                <DecoyIcon app={slot.decoy} size={ICON} />
                {slot.decoy.badge ? <Badge count={slot.decoy.badge} /> : null}
              </Tile>
            )
          )}
        </div>
      </div>

      {/* 페이지 점 */}
      <div className="flex justify-center gap-1.5 pb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>

      {/* 독 — 맨 오른쪽 설정을 누르면 원래 테마로 돌아와요 */}
      <div
        className="mx-4 flex items-center justify-around rounded-[30px] bg-white/20 px-3 py-3 backdrop-blur"
        style={{ marginBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {dock.map((app) => (
          <DecoyIcon key={app.key} app={app} size={ICON} />
        ))}
        <button
          type="button"
          onClick={onExit}
          aria-label={TEXT.disguise.exitLabel}
          className="transition active:scale-95"
        >
          <DecoyIcon app={DECOY_APPS.find((a) => a.key === "settings")!} size={ICON} />
        </button>
      </div>
    </div>
  );
}
