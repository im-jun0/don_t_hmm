"use client";

import { useEffect, useState } from "react";
import { FANFARE_RANK, GAME, TEXT } from "@/config";
import {
  fetchCheerLeaderboard,
  fetchGameLeaderboard,
  fetchTotalLeaderboard,
  type LeaderRow,
  type RankRow,
} from "@/lib/api";
import Fanfare from "@/components/Fanfare";
import RankList from "@/components/RankList";

/** 내가 탑3 안에 들었으면 어느 부문 몇 등인지 돌려줘요. (여러 부문이면 더 높은 등수 하나만) */
function myBestRank(
  boards: { award: string; rows: RankRow[] }[]
): { rank: number; award: string } | null {
  let best: { rank: number; award: string } | null = null;
  for (const board of boards) {
    const mine = board.rows.find((r) => r.isMe);
    if (!mine || mine.rank > FANFARE_RANK) continue;
    if (!best || mine.rank < best.rank) best = { rank: mine.rank, award: board.award };
  }
  return best;
}

export default function RankingView() {
  const [totals, setTotals] = useState<RankRow[]>([]);
  const [game, setGame] = useState<LeaderRow[]>([]);
  const [cheers, setCheers] = useState<RankRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [celebrate, setCelebrate] = useState<{ rank: number; award: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchTotalLeaderboard().catch(() => [] as RankRow[]),
      fetchGameLeaderboard(GAME.leaderboardDays).catch(() => [] as LeaderRow[]),
      fetchCheerLeaderboard().catch(() => [] as RankRow[]),
    ]).then(([t, g, c]) => {
      if (cancelled) return;
      setTotals(t);
      setGame(g);
      setCheers(c);
      setLoaded(true);
      // 들어오자마자 한 번만 울려요. 폴링이 없어서 다시 울릴 일도 없어요.
      setCelebrate(
        myBestRank([
          { award: TEXT.ranking.totalAward, rows: t },
          { award: TEXT.ranking.gameAward, rows: g },
          { award: TEXT.ranking.cheerAward, rows: c },
        ])
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
      {celebrate && (
        <Fanfare
          title={TEXT.ranking.congrats(celebrate.rank, celebrate.award)}
          subtitle={TEXT.ranking.congratsSub}
        />
      )}

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TEXT.ranking.title}</h1>
      <p className="mt-2 break-keep text-neutral-500">{TEXT.ranking.subtitle}</p>

      {!loaded && (
        <p className="mt-10 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
          {TEXT.loading}
        </p>
      )}

      {loaded && (
        <>
          <section className="mt-12">
            <h2 className="break-keep text-xl font-semibold tracking-tight">
              🏅 {TEXT.ranking.totalAward}
            </h2>
            <p className="mb-4 mt-1 text-sm text-neutral-500">{TEXT.ranking.totalHint}</p>
            <RankList rows={totals} emptyText={TEXT.ranking.empty} />
          </section>

          <section className="mt-12">
            <h2 className="break-keep text-xl font-semibold tracking-tight">
              🎯 {TEXT.ranking.gameAward}
            </h2>
            <p className="mb-4 mt-1 text-sm text-neutral-500">
              {TEXT.ranking.gameHint(GAME.leaderboardDays)}
            </p>
            <RankList
              rows={game}
              emptyText={TEXT.ranking.empty}
              suffix={(row) => `/ ${(row as LeaderRow).rounds}판`}
            />
          </section>

          <section className="mt-12">
            <h2 className="break-keep text-xl font-semibold tracking-tight">
              🙏 {TEXT.ranking.cheerAward}
            </h2>
            <p className="mb-4 mt-1 text-sm text-neutral-500">{TEXT.ranking.cheerHint}</p>
            <RankList rows={cheers} emptyText={TEXT.ranking.empty} />
          </section>
        </>
      )}
    </main>
  );
}
