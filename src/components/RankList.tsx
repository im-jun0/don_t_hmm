"use client";

import { LAST_RANK_TITLE, RANK_TITLES, TEXT } from "@/config";
import type { RankRow } from "@/lib/api";

const MEDALS = ["🥇", "🥈", "🥉"];

/** 많이 누른 사람이 1등. 마지막 등수에만 따로 타이틀을 붙여요. */
function rankTitle(rank: number, lastRank: number): string | null {
  if (rank === lastRank && lastRank > 1) return LAST_RANK_TITLE;
  return RANK_TITLES[rank - 1] ?? null;
}

/**
 * 순위 목록. 게임의 "이번 판 순위" 와 랭킹 탭이 같이 써요.
 * titles=true 면 등수별 비꼬는 타이틀을 줄마다 붙여요. (랭킹 탭은 부문 이름이 따로 있어서 끔)
 */
export default function RankList({
  rows,
  titles = false,
  emptyText = TEXT.game.rankingEmpty,
  suffix,
}: {
  rows: RankRow[];
  titles?: boolean;
  emptyText?: string;
  suffix?: (row: RankRow) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-600">{emptyText}</p>
    );
  }
  const lastRank = rows[rows.length - 1].rank;

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => {
        const title = titles ? rankTitle(row.rank, lastRank) : null;
        const medal = MEDALS[row.rank - 1];
        return (
          <li
            key={`${row.rank}-${row.name}`}
            className={
              "flex items-center gap-3 rounded-2xl border px-4 py-3 " +
              (row.isMe ? "border-neutral-900 bg-neutral-50" : "border-neutral-200")
            }
          >
            <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-neutral-400">
              {medal ?? row.rank}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-medium">{row.name}</span>
              {title && <span className="truncate text-xs text-neutral-500">{title}</span>}
            </span>
            <span className="ml-auto shrink-0 text-lg font-semibold tabular-nums">
              {row.count.toLocaleString()}
              {suffix && (
                <span className="ml-1 text-xs font-normal text-neutral-400">{suffix(row)}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
