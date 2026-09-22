"use client";

import { useState } from "react";
import { TEXT } from "@/config";
import { signInWithKakao } from "@/lib/api";
import SoulLeaving from "@/components/SoulLeaving";

/** 로그인 전 화면. 헤더/탭바 없이 이 화면만 보여요. */
export default function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{TEXT.login.title}</h1>
        <p className="mt-4 break-keep leading-relaxed text-neutral-500">
          {TEXT.login.subtitle.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      <SoulLeaving size={150} className="text-neutral-900" />

      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setFailed(false);
            signInWithKakao().catch(() => {
              setBusy(false);
              setFailed(true);
            });
          }}
          className="rounded-2xl bg-[#FEE500] px-7 py-3.5 text-[15px] font-semibold text-[#191600] transition hover:brightness-95 active:scale-95 disabled:opacity-60"
        >
          {TEXT.auth.loginButton}
        </button>
        {failed && <p className="mt-4 text-sm text-red-600">{TEXT.errorFetch}</p>}
      </div>
    </main>
  );
}
