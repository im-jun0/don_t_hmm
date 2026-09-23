import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { GAME, TEXT } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 스케줄러가 몇 분마다 한 번씩 때려주는 엔드포인트예요. 두 가지 일을 해요.
 *   1) 오늘 판이 없으면 업무시간 중 랜덤 시각으로 하나 만들어요.
 *   2) 그 시각이 지났는데 아직 안 쐈으면 구독자 전원에게 푸시를 보내요.
 * 몇 번을 불러도 결과가 같도록(멱등) 짜여 있어서 주기는 자유롭게 잡아도 돼요.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC 로 도는 서버에서도 KST 기준 오늘 날짜와 업무시간 경계를 정확히 계산해요. */
function kstToday(now: Date) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  return {
    roundDate: `${y}-${pad(m + 1)}-${pad(d)}`,
    windowStart: Date.UTC(y, m, d, GAME.windowStartHour, 0, 0) - KST_OFFSET_MS,
    windowEnd: Date.UTC(y, m, d, GAME.windowEndHour, 0, 0) - KST_OFFSET_MS,
  };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("missing supabase env");
  return createClient(url, secret, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = admin();
  const now = new Date();
  const { roundDate, windowStart, windowEnd } = kstToday(now);

  // 1) 오늘 판 만들기 — 지금부터 업무시간 끝까지 중에서 랜덤으로.
  const { data: existing } = await db
    .from("game_rounds")
    .select("id, start_at, notified_at")
    .eq("round_date", roundDate)
    .maybeSingle();

  let round = existing;
  if (!round) {
    const from = Math.max(now.getTime(), windowStart);
    if (from >= windowEnd) {
      return Response.json({ ok: true, action: "window closed", roundDate });
    }
    const startAt = new Date(from + Math.random() * (windowEnd - from));
    const { data: created, error } = await db
      .from("game_rounds")
      .insert({
        round_date: roundDate,
        start_at: startAt.toISOString(),
        duration_sec: GAME.durationSec,
      })
      .select("id, start_at, notified_at")
      .maybeSingle();
    // 같은 순간에 두 번 불렸으면 unique 제약에 걸려요. 그건 실패가 아니에요.
    if (error && error.code !== "23505") throw error;
    if (!created) return Response.json({ ok: true, action: "already created", roundDate });
    round = created;
  }

  // 2) 시작 시각이 됐으면 푸시 발송 (한 판에 한 번만)
  if (round.notified_at || new Date(round.start_at) > now) {
    return Response.json({ ok: true, action: "nothing to send", roundDate });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("missing vapid env");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey
  );

  // notified_at 을 먼저 찍어서, 발송이 오래 걸려도 다음 tick 이 또 쏘지 않게 해요.
  const { data: claimed } = await db
    .from("game_rounds")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", round.id)
    .is("notified_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return Response.json({ ok: true, action: "already notified", roundDate });

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  const payload = JSON.stringify({
    title: TEXT.game.title,
    body: TEXT.game.liveHint,
    url: "/game",
    tag: "dont-hmm-game",
  });

  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (e) {
        // 404/410 = 사용자가 알림을 껐거나 브라우저가 구독을 버린 것. 정리해요.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    })
  );
  if (dead.length > 0) await db.from("push_subscriptions").delete().in("id", dead);

  return Response.json({
    ok: true,
    action: "notified",
    roundDate,
    sent: (subs ?? []).length - dead.length,
    removed: dead.length,
  });
}
