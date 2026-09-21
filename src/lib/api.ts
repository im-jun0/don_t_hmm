import { API_URL } from "@/config";

export type Row = { id: number; actor: string; name: string; count: number };
export type Snapshot = { users: string[]; rows: Row[] | null };

/** 사용자 목록을 가져오고, user 를 주면 그 사용자 탭의 행들도 함께 가져와요. */
export async function fetchSnapshot(user: string | null): Promise<Snapshot> {
  const url = user ? `${API_URL}?user=${encodeURIComponent(user)}` : API_URL;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { users: data.users ?? [], rows: user ? (data.rows ?? []) : null };
}

/** 카운트를 1 올리고 서버가 알려주는 최종 숫자를 돌려줘요. */
export async function addCount(user: string, id: number): Promise<number> {
  const res = await fetch(API_URL, {
    method: "POST",
    // text/plain 이어야 CORS preflight 없이 Apps Script 로 전달돼요
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ user, id }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.count as number;
}
