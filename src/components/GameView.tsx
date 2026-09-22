"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GAME, TEXT } from "@/config";
import {
  fetchGameRanking,
  fetchGameState,
  gameTap,
  type GameState,
  type RankRow,
} from "@/lib/api";
import PushToggle from "@/components/PushToggle";
import RankList from "@/components/RankList";

export default function GameView() {
  const [state, setState] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [remainMs, setRemainMs] = useState(0);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [myCount, setMyCount] = useState(0);
  const pending = useRef(0); // 저장 중인 탭 수 (폴링이 낙관적 숫자를 덮어쓰지 않게)
  const deadline = useRef(0); // 내 기기 시계 기준으로 환산한 종료 시각

  const load = useCallback(async () => {
    try {
      const next = await fetchGameState();
      setState(next);
      if (next && pending.current === 0) setMyCount(next.myCount);
      if (next?.endsAt) {
        // 서버 시각과 내 시계의 차이를 빼서 타이머를 맞춰요.
        const skew = Date.parse(next.serverNow) - Date.now();
        deadline.current = Date.parse(next.endsAt) - skew;
      }
    } catch {
      /* 폴링이라 다음 차례에 다시 시도해요 */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, GAME.pollMs);
    return () => clearInterval(t);
  }, [load]);

  const status = state?.status ?? null;

  // 진행 중일 때만 남은 시간을 잘게 갱신해요.
  useEffect(() => {
    if (status !== "live") return;
    let finished = false; // 0초가 된 뒤 100ms 마다 계속 다시 불러오지 않게
    const tick = () => {
      const left = deadline.current - Date.now();
      setRemainMs(left > 0 ? left : 0);
      if (left <= 0 && !finished) {
        finished = true;
        load(); // 끝났으면 바로 결과로 넘어가요
      }
    };
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [status, load]);

  // 끝난 판이면 순위를 불러와요.
  useEffect(() => {
    if (status !== "done" || !state) return;
    fetchGameRanking(state.roundId).then(setRanking).catch(() => {});
  }, [status, state]);

  const tap = async () => {
    if (!state || state.status !== "live") return;
    setMyCount((n) => n + 1);
    pending.current++;
    try {
      const serverCount = await gameTap(state.roundId);
      setMyCount(serverCount);
    } catch {
      setMyCount((n) => n - 1); // 타이머가 끝난 뒤 도착한 탭은 서버가 거절해요
    } finally {
      pending.current--;
    }
  };

  const seconds = Math.ceil(remainMs / 1000);
  const progress = status === "live" ? remainMs / (GAME.durationSec * 1000) : 0;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
      {!loaded && (
        <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">{TEXT.loading}</p>
      )}

      {loaded && status === "live" && (
        <section className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TEXT.game.title}</h1>
          <p className="mt-2 break-keep text-neutral-500">{TEXT.game.liveHint}</p>

          <p className="mt-8 text-7xl font-semibold tabular-nums tracking-tight">{seconds}</p>
          <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>

          <p className="mt-10 text-sm text-neutral-500">{TEXT.game.tapHint}</p>
          <button
            type="button"
            onClick={tap}
            className="mt-4 flex h-52 w-52 flex-col items-center justify-center gap-1 rounded-full bg-neutral-900 text-white transition active:scale-95"
          >
            <span className="text-5xl font-semibold tabular-nums">{myCount}</span>
            <span className="text-sm font-medium opacity-70">{TEXT.game.tapButton}</span>
          </button>
        </section>
      )}

      {loaded && status !== "live" && (
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {status === "done" ? TEXT.game.doneTitle : TEXT.game.waitingTitle}
          </h1>
          <p className="mt-2 break-keep text-neutral-500">
            {status === "done" ? TEXT.game.myCount(myCount) : TEXT.game.waitingHint}
          </p>
          {loaded && !state && <p className="mt-2 text-neutral-500">{TEXT.game.noRound}</p>}

          <div className="mt-8">
            <PushToggle />
          </div>

          {status === "done" && (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{TEXT.game.roundRanking}</h2>
              <RankList rows={ranking} titles />
            </section>
          )}
        </section>
      )}
    </main>
  );
}
