"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { POLL_MS, TEXT } from "@/config";
import { fetchDailyCounts, fetchSnapshot, fetchTodayByUser, type Row } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";

// dataviz 스킬 참고 팔레트 (이 앱은 라이트 모드 전용이라 hex 로 고정)
const BLUE = "#2a78d6";
const GRID = "#e1e0d9";
const MUTED = "#898781";
const DAYS = 14;

function dayLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function todayKST(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const day = String(kst.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-md">
      <div className="text-base font-semibold tabular-nums text-neutral-900">
        {p.count.toLocaleString()}
      </div>
      <div className="text-xs text-neutral-500">{p.label}</div>
    </div>
  );
}

function LineTooltip({ active, payload }: { active?: boolean; payload?: { payload: { day: string; count: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-md">
      <div className="text-base font-semibold tabular-nums text-neutral-900">
        {p.count.toLocaleString()}
      </div>
      <div className="text-xs text-neutral-500">{dayLabel(p.day)}</div>
    </div>
  );
}

export default function StatsView() {
  const { user } = useSelectedUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [daily, setDaily] = useState<{ day: string; count: number }[]>([]);
  const [today, setToday] = useState<{ name: string; count: number; isMe: boolean }[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async (target: string | null) => {
    try {
      // 친구들 오늘치는 누가 선택돼 있든 똑같아서 따로 가져와요.
      fetchTodayByUser().then(setToday).catch(() => {});
      const snap = await fetchSnapshot(target);
      if (!target) {
        setRows([]);
        setUserId(null);
        setDaily([]);
        setStatus("ready");
        return;
      }
      setRows(snap.rows ?? []);
      setUserId(snap.userId);
      if (snap.userId) {
        setDaily(await fetchDailyCounts(snap.userId, DAYS));
      } else {
        setDaily([]);
      }
      setStatus("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error && e.message ? e.message : TEXT.errorFetch);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load(user);
    const t = setInterval(() => load(user), POLL_MS);
    return () => clearInterval(t);
  }, [user, load]);

  // 현황은 누적을 보여줘요. 카드의 count 는 오늘치라 자정마다 0 이 돼요.
  const total = rows.reduce((s, r) => s + r.totalCount, 0);
  const actorCount = new Set(rows.map((r) => r.actor)).size;

  const barData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.totalCount - a.totalCount)
        .map((r) => ({ label: `${r.actor} · ${r.name}`, count: r.totalCount })),
    [rows]
  );

  const lineData = useMemo(() => {
    const byDay = new Map(daily.map((d) => [d.day, d.count]));
    return Array.from({ length: DAYS }, (_, i) => {
      const day = todayKST(DAYS - 1 - i);
      return { day, count: byDay.get(day) ?? 0 };
    });
  }, [daily]);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
      {status === "error" && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {errorMsg || TEXT.errorFetch}
        </p>
      )}

      {status === "ready" && !user && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {TEXT.stats.noUser}
        </p>
      )}

      {status === "ready" && user && !userId && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {TEXT.emptyAll}
        </p>
      )}

      {status === "ready" && userId && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{user}</h1>

          {/* 요약 */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              [TEXT.stats.totalLabel, total],
              [TEXT.stats.itemLabel, rows.length],
              [TEXT.stats.actorLabel, actorCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-neutral-200 p-4">
                <div className="text-2xl font-semibold tabular-nums tracking-tight">
                  {Number(value).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-neutral-500">{label}</div>
              </div>
            ))}
          </div>

          {/* 오늘 친구들 — 카드 말고 한 줄씩 */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">{TEXT.stats.todayTitle}</h2>
            <p className="mt-1 text-xs text-neutral-400">{TEXT.stats.todayHint}</p>
            {/* 한 명당 한 줄짜리 작은 카드. 0 이어도 이름은 보여줘요 — 누가 조용한지도 정보니까요. */}
            <ul className="mt-4 flex flex-col gap-2">
              {today.map((t) => (
                <li
                  key={t.name}
                  className={
                    "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm " +
                    (t.isMe
                      ? "border-neutral-900 bg-neutral-50 font-semibold text-neutral-900"
                      : "border-neutral-200 text-neutral-600")
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span
                    className={
                      "shrink-0 text-base tabular-nums " +
                      (t.count === 0 ? "text-neutral-300" : "font-semibold text-neutral-900")
                    }
                  >
                    {t.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {rows.length === 0 ? (
            <p className="mt-10 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
              {TEXT.stats.empty}
            </p>
          ) : (
            <>
              {/* 막대: 항목별 누적 */}
              <section className="mt-10">
                <h2 className="text-lg font-semibold tracking-tight">{TEXT.stats.barTitle}</h2>
                <div style={{ height: Math.max(180, barData.length * 40) }} className="mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
                      <CartesianGrid horizontal={false} stroke={GRID} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: MUTED }}
                      />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                      <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* 라인: 최근 14일 추이 */}
              <section className="mt-10">
                <h2 className="text-lg font-semibold tracking-tight">{TEXT.stats.lineTitle}</h2>
                <p className="mt-1 text-xs text-neutral-400">{TEXT.stats.lineNote}</p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={dayLabel}
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                        tick={{ fontSize: 12, fill: MUTED }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        tick={{ fontSize: 12, fill: MUTED }}
                      />
                      <Tooltip content={<LineTooltip />} cursor={{ stroke: GRID }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={BLUE}
                        strokeWidth={2}
                        dot={{ r: 3, fill: BLUE, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
