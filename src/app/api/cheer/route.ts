import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { TEXT } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 다른 사람 페이지에서 "힘내요"를 누르면 여기로 와요. 보낸 사람을 토큰으로 확인하고,
 * cheers 에 기록한 뒤 받는 사람의 구독으로 웹푸시를 쏴요. (RLS 정책이 없는 테이블이라
 * secret key 로만 건드릴 수 있어요 — game_rounds/push_subscriptions 와 같은 이유예요.)
 */

const COOLDOWN_MS = 10 * 60 * 1000; // 같은 사람에게 10분 안에 또 보내는 건 막아요 (스팸 방지)

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("missing supabase env");
  return createClient(url, secret, { auth: { persistSession: false } });
}

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: authData, error: authError } = await anon().auth.getUser(token);
  if (authError || !authData.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const toUserId = body?.toUserId;
  if (typeof toUserId !== "string") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const db = admin();

  const { data: fromUser } = await db
    .from("users")
    .select("id, name")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (!fromUser) return Response.json({ error: "not linked" }, { status: 403 });
  if (fromUser.id === toUserId) return Response.json({ error: "self" }, { status: 400 });

  const { data: toUser } = await db.from("users").select("id, name").eq("id", toUserId).maybeSingle();
  if (!toUser) return Response.json({ error: "not found" }, { status: 404 });

  const { data: recent } = await db
    .from("cheers")
    .select("id")
    .eq("from_user_id", fromUser.id)
    .eq("to_user_id", toUser.id)
    .gt("created_at", new Date(Date.now() - COOLDOWN_MS).toISOString())
    .maybeSingle();
  if (recent) return Response.json({ error: "cooldown" }, { status: 429 });

  const { error: insertError } = await db
    .from("cheers")
    .insert({ from_user_id: fromUser.id, to_user_id: toUser.id });
  if (insertError) throw insertError;

  // 힘내요 자체는 이미 기록됐어요. 푸시는 "되면 좋은" 부가 기능이라, 여기서 뭐가
  // 터지든(키 형식 오류, 네트워크 등) 응답은 항상 성공으로 돌려줘요.
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@example.com",
        publicKey,
        privateKey
      );

      const { data: subs } = await db
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", toUser.id);

      const payload = JSON.stringify({
        title: TEXT.cheer.pushTitle(fromUser.name),
        body: TEXT.cheer.pushBody,
        url: "/",
        tag: "dont-hmm-cheer",
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
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) dead.push(s.id);
          }
        })
      );
      if (dead.length > 0) await db.from("push_subscriptions").delete().in("id", dead);
    }
  } catch (e) {
    console.error("cheer push failed", e);
  }

  return Response.json({ ok: true });
}
