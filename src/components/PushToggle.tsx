"use client";

import { useEffect, useState } from "react";
import { TEXT } from "@/config";
import { currentSubscription, disablePush, enablePush, pushDenied, pushSupported } from "@/lib/push";

/** 게임 시작 알림 켜기/끄기. 아이폰은 홈 화면에 추가해야 지원돼요. */
export default function PushToggle() {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    currentSubscription()
      .then((sub) => setOn(Boolean(sub)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  if (!pushSupported()) {
    return (
      <p className="rounded-2xl bg-neutral-50 px-5 py-4 text-sm break-keep text-neutral-600">
        {TEXT.game.pushUnsupported}
      </p>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setErrorMsg("");
    try {
      if (on) {
        await disablePush();
        setOn(false);
      } else {
        await enablePush();
        setOn(true);
      }
    } catch (e) {
      const denied = (e instanceof Error && e.message === "denied") || pushDenied();
      setErrorMsg(denied ? TEXT.game.pushDenied : TEXT.game.pushFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className={
            "rounded-xl px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-50 " +
            (on
              ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              : "bg-neutral-900 text-white")
          }
        >
          {on ? TEXT.game.pushDisable : TEXT.game.pushEnable}
        </button>
        <span className="text-sm text-neutral-500">{on ? TEXT.game.pushOn : TEXT.game.pushOff}</span>
      </div>
      {errorMsg && <p className="text-sm break-keep text-red-600">{errorMsg}</p>}
    </div>
  );
}
