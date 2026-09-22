"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DISGUISE_APP_NAMES, DISGUISE_DOCK, POLL_MS, TEXT } from "@/config";
import { fetchSnapshot, incrementItem, type Row } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";

/**
 * 위장 테마. 아이폰 홈 화면처럼 보이게 깔아요.
 * 항목은 그대로 앱이 되고, 카운트는 아이콘 위 빨간 뱃지로 나와요.
 * 눌러도 이모지가 안 튀어요 — 그게 목적이니까요. 독 맨 오른쪽 설정으로 돌아와요.
 */

/** 항목 순서대로 가짜 앱 이름을 붙여요. 모자라면 앞에서부터 다시 써요. */
function appName(index: number): string {
  return DISGUISE_APP_NAMES[index % DISGUISE_APP_NAMES.length];
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff3b30] px-1.5 text-[12px] font-semibold leading-none text-white shadow-sm">
      {count > 999 ? "999+" : count}
    </span>
  );
}

/** 앱 아이콘 하나. 이미지가 있으면 그대로 쓰고, 없으면 색 타일로 대신해요. */
function AppIcon({ row }: { row: Row }) {
  if (row.backgroundImageUrl) {
    return (
      <span
        className="block h-[60px] w-[60px] rounded-[15px] bg-cover bg-center shadow-sm ring-1 ring-black/10"
        style={{ backgroundImage: `url(${row.backgroundImageUrl})` }}
      />
    );
  }
  return (
    <span
      className="flex h-[60px] w-[60px] items-center justify-center rounded-[15px] text-xl font-semibold text-black/45 shadow-sm ring-1 ring-black/10"
      style={{ background: row.backgroundColor ?? "linear-gradient(160deg,#fdfdfd,#dcdce1)" }}
    >
      {row.name.trim().slice(0, 1)}
    </span>
  );
}

/** 독에 놓이는 들러리. 누르면 아무 일도 안 일어나요. */
function DecoyIcon({ label }: { label: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[15px] bg-gradient-to-b from-white to-neutral-300 text-[11px] font-medium text-neutral-500 shadow-sm ring-1 ring-black/10">
        {label}
      </span>
    </span>
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
        {/* 신호 */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
          <rect x="4.6" y="5.5" width="3" height="5.5" rx="1" />
          <rect x="9.2" y="3" width="3" height="8" rx="1" />
          <rect x="13.8" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* 와이파이 */}
        <svg width="16" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <path d="M1 4.2a10.5 10.5 0 0 1 14 0M3.7 7a6.6 6.6 0 0 1 8.6 0" />
          <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        {/* 배터리 */}
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        background:
          "linear-gradient(165deg,#3f4c6b 0%,#5c6b8a 35%,#8a7f9c 70%,#c2a3a8 100%)",
      }}
    >
      <StatusBar />

      <div className="flex-1 px-6 pb-4 pt-8">
        {loaded && rows.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/70">{TEXT.disguise.empty}</p>
        )}

        <div className="grid grid-cols-4 gap-x-4 gap-y-6">
          {rows.map((row, i) => (
            <button
              key={row.id}
              type="button"
              onClick={() => tap(row)}
              className="flex flex-col items-center gap-1.5 transition active:scale-95"
            >
              <span className="relative">
                <AppIcon row={row} />
                <Badge count={row.count} />
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-white drop-shadow">
                {appName(i)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 독 — 맨 오른쪽 설정을 누르면 원래 테마로 돌아와요 */}
      <div
        className="mx-4 mb-2 flex items-center justify-around rounded-[28px] bg-white/20 px-3 py-3 backdrop-blur"
        style={{ marginBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {DISGUISE_DOCK.map((label) => (
          <DecoyIcon key={label} label={label} />
        ))}
        <button
          type="button"
          onClick={onExit}
          aria-label={TEXT.disguise.exitLabel}
          className="flex flex-col items-center transition active:scale-95"
        >
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[15px] bg-gradient-to-b from-neutral-300 to-neutral-500 shadow-sm ring-1 ring-black/10">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.6} aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 14.2a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 0 1-3.81 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.78 1.6 1.6 0 0 0-1.47-.97h-.17a1.9 1.9 0 0 1 0-3.81h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.9 1.9 0 1 1 3.81 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.78-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 0 1 0 3.81h-.09a1.6 1.6 0 0 0-1.47.97z" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
