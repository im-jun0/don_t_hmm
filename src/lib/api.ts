import { supabase, supabaseReady } from "@/lib/supabase";
import { TEXT } from "@/config";

export type Row = {
  id: string;
  actor: string;
  name: string;
  /** 오늘 눌린 횟수. 날짜가 바뀌면 저절로 0 이에요. 카드와 위장 테마 뱃지가 써요. */
  count: number;
  /** 누적. 현황과 랭킹이 써요. */
  totalCount: number;
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  sortOrder: number;
};
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

  // 오늘치는 item_daily_counts 에, 누적은 items.count 에 있어서 RPC 로 한 번에 가져와요.
  const { data, error } = await supabase.rpc("items_with_counts", { p_user_id: target.id });
  if (error) throw error;
  const rows: Row[] = (data ?? []).map(
    (r: {
      id: string;
      actor: string;
      name: string;
      today_count: number;
      total_count: number;
      background_color: string | null;
      background_image_url: string | null;
      sort_order: number;
    }) => ({
      id: r.id,
      actor: r.actor,
      name: r.name,
      count: r.today_count,
      totalCount: r.total_count,
      backgroundColor: r.background_color,
      backgroundImageUrl: r.background_image_url,
      sortOrder: r.sort_order,
    })
  );
  return { users: names, userId: target.id, rows };
}

/** 카운트를 1 올리고 서버가 알려주는 오늘치 최종 숫자를 돌려줘요. */
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

/* ── 카드 꾸미기 (PIN 없음 — 카운트 클릭처럼 누구나) ── */

export async function setItemStyle(
  itemId: string,
  style: { backgroundColor: string | null; backgroundImageUrl: string | null }
): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("set_item_style", {
    p_item_id: itemId,
    p_background_color: style.backgroundColor,
    p_background_image_url: style.backgroundImageUrl,
  });
  if (error) throw error;
}

export async function uploadItemImage(itemId: string, file: File): Promise<string> {
  assertReady();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("item-backgrounds").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("item-backgrounds").getPublicUrl(path);
  return data.publicUrl;
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

/* ── 카카오 로그인 (Supabase Auth) ── */

/** 로그인한 카카오 계정에 연결된 사용자. 아직 이름을 연결하지 않았으면 null. */
export async function fetchMyUser(): Promise<UserRow | null> {
  assertReady();
  const { data, error } = await supabase.rpc("my_user");
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ? { id: row.id, name: row.name, sortOrder: row.sort_order } : null;
}

/** 아직 아무 카카오 계정과도 연결되지 않은 사용자 목록 (최초 1회 이름 연결 화면) */
export async function fetchUnlinkedUsers(): Promise<UserRow[]> {
  assertReady();
  const { data, error } = await supabase.rpc("unlinked_users");
  if (error) throw error;
  return (data ?? []).map((u: { id: string; name: string; sort_order: number }) => ({
    id: u.id,
    name: u.name,
    sortOrder: u.sort_order,
  }));
}

/** 기존 사용자 행을 내 카카오 계정에 연결해요. */
export async function claimUser(userId: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("claim_user", { p_user_id: userId });
  if (error) throw error;
}

/** 새 이름으로 사용자를 만들고 내 카카오 계정에 연결해요. */
export async function createMyUser(name: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("create_my_user", { p_name: name });
  if (error) throw error;
}

/** 로그인한 내 페이지에서 PIN 없이 바로 항목을 추가해요 (내 계정으로만). */
export async function addMyItem(actor: string, name: string): Promise<string> {
  assertReady();
  const { data, error } = await supabase.rpc("add_my_item", { p_actor: actor, p_name: name });
  if (error) throw error;
  return data as string;
}

/** 로그인한 내 페이지에서 PIN 없이 내 항목을 바로 삭제해요 (내 계정 소유만). */
export async function deleteMyItem(itemId: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("delete_my_item", { p_item_id: itemId });
  if (error) throw error;
}

/** 로그인한 내 페이지에서 PIN 없이 내 항목의 행위자/행위명을 바로 수정해요 (내 계정 소유만). */
export async function updateMyItem(itemId: string, actor: string, name: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("update_my_item", { p_item_id: itemId, p_actor: actor, p_name: name });
  if (error) throw error;
}

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_STATE_KEY = "donthmm:kakao_state";

/**
 * 카카오 로그인 페이지로 보내요. 끝나면 /auth/callback 으로 돌아와요.
 *
 * supabase.auth.signInWithOAuth("kakao") 를 안 써요. 그 경로는 Supabase 가
 * account_email 까지 같이 요청하는데, 그건 비즈 앱에서만 켤 수 있는 동의항목이라
 * 개인 개발자 앱에서는 KOE205 로 로그인이 막혀요. 클라이언트에서 그 스코프를 뺄 방법도 없고요.
 * 그래서 인가만 우리가 직접 받아요 — 필요한 건 닉네임뿐이니까 scope 도 딱 그만큼만.
 * 받은 ID 토큰은 /auth/callback 에서 signInWithIdToken 으로 Supabase 에 넘겨요.
 */
export async function signInWithKakao(): Promise<void> {
  assertReady();
  const restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  if (!restApiKey) throw new Error(TEXT.auth.missingKakaoKey);

  // 돌아왔을 때 내가 보낸 요청이 맞는지 확인하는 값 (CSRF 방지)
  const state = crypto.randomUUID();
  sessionStorage.setItem(KAKAO_STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: restApiKey,
    redirect_uri: `${window.location.origin}/auth/callback`,
    scope: "openid profile_nickname", // openid 가 있어야 ID 토큰이 나와요
    state,
  });
  window.location.href = `${KAKAO_AUTHORIZE_URL}?${params}`;
}

/** 돌아온 인가 코드를 세션으로 바꿔요. state 가 안 맞으면 내가 시작한 로그인이 아니에요. */
export async function completeKakaoSignIn(code: string, state: string | null): Promise<void> {
  assertReady();
  const expected = sessionStorage.getItem(KAKAO_STATE_KEY);
  sessionStorage.removeItem(KAKAO_STATE_KEY);
  if (!expected || expected !== state) throw new Error("state mismatch");

  const res = await fetch("/api/auth/kakao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok || !data.idToken) throw new Error(data.error || "token exchange failed");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "kakao",
    token: data.idToken,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  assertReady();
  await supabase.auth.signOut();
}

/* ── 미니게임 ── */

export type GameStatus = "waiting" | "live" | "done";
export type GameState = {
  roundId: string;
  status: GameStatus;
  /** 진행 중이거나 끝난 판만 값이 있어요. 대기 중엔 시작 시각을 숨겨요. */
  endsAt: string | null;
  /** 기기 시계가 틀어져 있어도 타이머가 맞도록 서버 시각을 같이 받아요. */
  serverNow: string;
  myCount: number;
};
export type RankRow = { rank: number; name: string; count: number; isMe: boolean };
export type LeaderRow = RankRow & { rounds: number };

/** 지금 판 상태. 아직 한 판도 없었으면 null. */
export async function fetchGameState(): Promise<GameState | null> {
  assertReady();
  const { data, error } = await supabase.rpc("game_state");
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    roundId: row.round_id,
    status: row.status as GameStatus,
    endsAt: row.ends_at,
    serverNow: row.server_now,
    myCount: row.my_count,
  };
}

/** 한 번 누르고 서버가 알려주는 최종 숫자를 돌려줘요. */
export async function gameTap(roundId: string): Promise<number> {
  assertReady();
  const { data, error } = await supabase.rpc("game_tap", { p_round_id: roundId });
  if (error) throw error;
  return data as number;
}

export async function fetchGameRanking(roundId: string): Promise<RankRow[]> {
  assertReady();
  const { data, error } = await supabase.rpc("game_ranking", { p_round_id: roundId });
  if (error) throw error;
  return (data ?? []).map((r: { rank: number; name: string; count: number; is_me: boolean }) => ({
    rank: r.rank,
    name: r.name,
    count: r.count,
    isMe: r.is_me,
  }));
}

export async function fetchGameLeaderboard(days: number): Promise<LeaderRow[]> {
  assertReady();
  const { data, error } = await supabase.rpc("game_leaderboard", { p_days: days });
  if (error) throw error;
  return (data ?? []).map(
    (r: { rank: number; name: string; count: number; rounds: number; is_me: boolean }) => ({
      rank: r.rank,
      name: r.name,
      count: r.count,
      rounds: r.rounds,
      isMe: r.is_me,
    })
  );
}

export type TodayItem = {
  itemId: string;
  actor: string;
  name: string;
  count: number;
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  userName: string;
  isMe: boolean;
};

/** 오늘 항목별 클릭 수 (전체 사용자). 현황 페이지의 "오늘 친구들" 미니 카드에 써요. */
export async function fetchTodayItems(): Promise<TodayItem[]> {
  assertReady();
  const { data, error } = await supabase.rpc("today_items");
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      item_id: string;
      actor: string;
      name: string;
      count: number;
      background_color: string | null;
      background_image_url: string | null;
      user_name: string;
      is_me: boolean;
    }) => ({
      itemId: r.item_id,
      actor: r.actor,
      name: r.name,
      count: r.count,
      backgroundColor: r.background_color,
      backgroundImageUrl: r.background_image_url,
      userName: r.user_name,
      isMe: r.is_me,
    })
  );
}

/* ── 랭킹 ── */

/** 사용자별 누적 카운트 순위. 많이 쌓인 사람이 1등이에요. */
export async function fetchTotalLeaderboard(): Promise<RankRow[]> {
  assertReady();
  const { data, error } = await supabase.rpc("total_leaderboard");
  if (error) throw error;
  return (data ?? []).map((r: { rank: number; name: string; count: number; is_me: boolean }) => ({
    rank: r.rank,
    name: r.name,
    count: r.count,
    isMe: r.is_me,
  }));
}

/** 힘내요를 가장 많이 받은 순위. */
export async function fetchCheerLeaderboard(): Promise<RankRow[]> {
  assertReady();
  const { data, error } = await supabase.rpc("cheer_leaderboard");
  if (error) throw error;
  return (data ?? []).map((r: { rank: number; name: string; count: number; is_me: boolean }) => ({
    rank: r.rank,
    name: r.name,
    count: r.count,
    isMe: r.is_me,
  }));
}

/** 다른 사람 페이지에서 힘내요를 보내요. 기록과 웹푸시 발송은 서버(/api/cheer)가 해요. */
export async function sendCheer(toUserId: string): Promise<void> {
  assertReady();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not signed in");

  const res = await fetch("/api/cheer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ toUserId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : "failed");
  }
}

/* ── 푸시 알림 구독 ── */

export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  assertReady();
  const { error } = await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
  if (error) throw error;
}
