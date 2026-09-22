"use client";

import { useEffect, useState } from "react";
import { TEXT } from "@/config";
import { claimUser, createMyUser, fetchUnlinkedUsers, type UserRow } from "@/lib/api";
import { notifyAuthChanged } from "@/lib/useAuth";
import HmmFace from "@/components/HmmFace";

/** 로그인 후 딱 한 번 보이는 화면. 이 카카오 계정에 쓸 이름을 고르거나 새로 만들어요. */
export default function LinkUser({ defaultName }: { defaultName: string }) {
  const [candidates, setCandidates] = useState<UserRow[]>([]);
  const [newName, setNewName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchUnlinkedUsers()
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, []);

  /** 성공하면 useAuth 가 다시 읽어서 이 화면은 사라져요. */
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErrorMsg("");
    try {
      await fn();
      notifyAuthChanged();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setErrorMsg(code === "23505" ? TEXT.auth.duplicateName : TEXT.auth.linkFailed);
      setBusy(false);
    }
  };

  return (
    <>
      <HmmFace size={104} className="mb-6 text-neutral-900" />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{TEXT.auth.linkTitle}</h1>
      <p className="mt-2 text-neutral-500">{TEXT.auth.linkHint}</p>

      {candidates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-neutral-500">{TEXT.auth.linkPick}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={busy}
                onClick={() => run(() => claimUser(u.id))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 active:scale-95 disabled:opacity-60"
              >
                {u.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">{TEXT.auth.linkCreate}</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            run(() => createMyUser(name));
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={TEXT.auth.linkCreatePlaceholder}
            maxLength={20}
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-95 disabled:opacity-40"
          >
            {TEXT.auth.linkSubmit}
          </button>
        </form>
      </section>

      {errorMsg && <p className="mt-4 text-sm text-red-600">{errorMsg}</p>}
    </>
  );
}
