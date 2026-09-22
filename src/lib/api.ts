import { supabase, supabaseReady } from "@/lib/supabase";
import { TEXT } from "@/config";

export type Row = { id: string; actor: string; name: string; count: number };
export type UserRow = { id: string; name: string; sortOrder: number };
export type Snapshot = { users: string[]; userId: string | null; rows: Row[] | null };
export type DailyCount = { day: string; count: number };

function assertReady() {
  if (!supabaseReady) throw new Error(TEXT.errorNoUrl);
}

export async function fetchUsers(): Promise<UserRow[]> {
  assertReady();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((u) => ({ id: u.id, name: u.name, sortOrder: u.sort_order }));
}

/** 사용자 목록을 가져오고, userName 을 주면 그 사용자의 항목들도 함께 가져와요. */
export async function fetchSnapshot(userName: string | null): Promise<Snapshot> {
  assertReady();
  const users = await fetchUsers();
  const names = users.map((u) => u.name);
  if (!userName) return { users: names, userId: null, rows: null };

  const target = users.find((u) => u.name === userName);
  if (!target) return { users: names, userId: null, rows: [] };

  const { data, error } = await supabase
    .from("items")
    .select("id, actor, name, count")
    .eq("user_id", target.id)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return { users: names, userId: target.id, rows: data ?? [] };
}

/** 카운트를 1 올리고 서버가 알려주는 최종 숫자를 돌려줘요. */
export async function incrementItem(itemId: string): Promise<number> {
  assertReady();
  const { data, error } = await supabase.rpc("increment_item", { p_item_id: itemId });
  if (error) throw error;
  return data as number;
}

/** 최근 p_days 일간 일자별 클릭 수 (현황 라인차트용) */
export async function fetchDailyCounts(userId: string, days = 14): Promise<DailyCount[]> {
  assertReady();
  const { data, error } = await supabase.rpc("daily_counts", { p_user_id: userId, p_days: days });
  if (error) throw error;
  return (data ?? []).map((d: { day: string; count: number }) => ({ day: d.day, count: Number(d.count) }));
}

/* ── 항목관리 (PIN 필요) ── */

export async function verifyPin(pin: string): Promise<boolean> {
  assertReady();
  const { data, error } = await supabase.rpc("admin_verify_pin", { p_pin: pin });
  if (error) throw error;
  return Boolean(data);
}

export async function upsertUser(
  pin: string,
  user: { id: string | null; name: string; sortOrder: number }
): Promise<string> {
  assertReady();
  const { data, error } = await supabase.rpc("admin_upsert_user", {
    p_pin: pin,
    p_id: user.id,
    p_name: user.name,
    p_sort_order: user.sortOrder,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteUser(pin: string, id: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("admin_delete_user", { p_pin: pin, p_id: id });
  if (error) throw error;
}

export async function upsertItem(
  pin: string,
  item: {
    id: string | null;
    userId: string;
    actor: string;
    name: string;
    count: number | null;
    sortOrder: number;
  }
): Promise<string> {
  assertReady();
  const { data, error } = await supabase.rpc("admin_upsert_item", {
    p_pin: pin,
    p_id: item.id,
    p_user_id: item.userId,
    p_actor: item.actor,
    p_name: item.name,
    p_count: item.count,
    p_sort_order: item.sortOrder,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteItem(pin: string, id: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("admin_delete_item", { p_pin: pin, p_id: id });
  if (error) throw error;
}
