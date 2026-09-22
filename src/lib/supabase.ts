import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseReady = Boolean(url && key);

// detectSessionInUrl: false — 주소의 해시는 우리가 사용자 선택(#/이름)에 쓰고 있어서
// supabase 가 거기서 토큰을 찾으려 들면 안 돼요. 로그인은 /auth/callback 이 직접 처리해요.
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: { detectSessionInUrl: false },
});
