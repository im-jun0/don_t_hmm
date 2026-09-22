"use client";

import { useState } from "react";
import { TEXT } from "@/config";
import { signOut } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";

/** 헤더 오른쪽의 이름 + 로그아웃. 로그인 전에는 AppShell 이 아예 로그인 화면을 보여줘요. */
export default function AuthMenu({ displayName }: { displayName: string }) {
  const { selectUser } = useSelectedUser();
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[7rem] truncate text-sm font-medium text-neutral-700">
        {displayName}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          selectUser(null); // 로그아웃하면 선택된 사용자도 풀어요
          await signOut();
          setBusy(false);
        }}
        className="rounded-full px-2 py-1 text-xs font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-60"
      >
        {TEXT.auth.logout}
      </button>
    </div>
  );
}
