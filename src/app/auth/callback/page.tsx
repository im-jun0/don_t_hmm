"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TEXT } from "@/config";
import { completeKakaoSignIn } from "@/lib/api";

/** 카카오 로그인 후 돌아오는 곳. 인가 코드를 세션으로 바꾸고 메인으로 보내요. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // useSearchParams 를 쓰면 Suspense 경계가 필요해서 주소에서 바로 읽어요.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      router.replace("/"); // 사용자가 카카오에서 취소한 경우
      return;
    }
    completeKakaoSignIn(code, params.get("state"))
      .then(() => router.replace("/"))
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : ""));
  }, [router]);

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
      <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm break-keep text-neutral-600">
        {errorMsg ? TEXT.auth.callbackFailed : TEXT.auth.callback}
      </p>
      {errorMsg && <p className="mt-3 px-5 text-xs text-neutral-400">{errorMsg}</p>}
    </main>
  );
}
