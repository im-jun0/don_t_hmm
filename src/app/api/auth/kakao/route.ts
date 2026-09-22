export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 카카오 인가 코드를 ID 토큰으로 바꿔주는 곳이에요.
 *
 * 왜 Supabase 의 카카오 로그인을 안 쓰고 직접 하냐면 —
 * Supabase Auth 는 카카오에 보낼 스코프를 서버에 하드코딩해두고 있어요.
 * (account_email / profile_image / profile_nickname, 그리고 클라이언트에서 줄일 수 없어요)
 * account_email 은 비즈 앱에서만 켤 수 있는 동의항목이라, 개인 개발자 앱에서는
 * "설정하지 않은 동의항목(KOE205)" 으로 로그인이 아예 막혀요.
 *
 * 그래서 인가는 우리가 scope=openid profile_nickname 으로 직접 받고,
 * 거기서 나온 ID 토큰만 supabase.auth.signInWithIdToken 으로 넘겨요.
 * 이러면 Supabase 가 카카오와 직접 통신할 일이 없어서 이메일을 요청하지 않아요.
 *
 * 토큰 교환에 client secret 이 필요해서 브라우저가 아니라 여기(서버)에서 해요.
 */

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

export async function POST(request: Request) {
  const restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!restApiKey) {
    return Response.json({ error: "missing NEXT_PUBLIC_KAKAO_REST_API_KEY" }, { status: 500 });
  }

  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof code !== "string" || !code) {
    return Response.json({ error: "missing code" }, { status: 400 });
  }

  // redirect_uri 는 클라이언트가 보낸 값을 믿지 않고 요청이 온 주소에서 뽑아요.
  // 인가할 때 쓴 주소와 한 글자라도 다르면 카카오가 거절해요.
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    redirect_uri: `${origin}/auth/callback`,
    code,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  const data = await res.json();

  if (!res.ok || !data.id_token) {
    // 카카오가 준 설명을 그대로 흘려보내요. 설정 실수를 찾기 쉬우라고요.
    return Response.json(
      { error: data.error_description || data.error || "token exchange failed" },
      { status: 400 }
    );
  }

  return Response.json({ idToken: data.id_token as string });
}
