"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "@/lib/supabase";
import { fetchMyUser, type UserRow } from "@/lib/api";

const AUTH_CHANGED = "donthmm:authchanged";

/** 세션은 그대로인데 내 사용자만 바뀌었을 때(이름 연결 직후) 알려줘요.
 *  화면들이 useAuth 를 각자 부르는 구조라 hashchange 처럼 window 이벤트로 맞춰요. */
export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED));
}

/** loading: 확인 중 / signedOut: 로그인 전 / needsLink: 로그인했지만 이름 연결 전 / ready: 사용 가능 */
export type AuthStatus = "loading" | "signedOut" | "needsLink" | "ready";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionKnown, setSessionKnown] = useState(!supabaseReady);
  const [me, setMe] = useState<UserRow | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabaseReady ? "loading" : "signedOut");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!supabaseReady) return;
    // 이 콜백 안에서 다른 supabase 호출을 하면 락이 걸릴 수 있어요. 여기선 세션만 담아둬요.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionKnown(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onChanged = () => setReloadKey((n) => n + 1);
    window.addEventListener(AUTH_CHANGED, onChanged);
    return () => window.removeEventListener(AUTH_CHANGED, onChanged);
  }, []);

  useEffect(() => {
    if (!sessionKnown) return;
    if (!session) {
      setMe(null);
      setStatus("signedOut");
      return;
    }
    let cancelled = false;
    fetchMyUser()
      .then((row) => {
        if (cancelled) return;
        setMe(row);
        setStatus(row ? "ready" : "needsLink");
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
        setStatus("needsLink");
      });
    return () => {
      cancelled = true;
    };
  }, [session, sessionKnown, reloadKey]);

  const meta = session?.user.user_metadata as
    | { name?: string; preferred_username?: string }
    | undefined;
  /** 화면에 보여줄 이름. 연결됐으면 연결된 이름, 아니면 카카오 닉네임. */
  const displayName = me?.name ?? meta?.name ?? meta?.preferred_username ?? "";

  return { status, me, displayName };
}
