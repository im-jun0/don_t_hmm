"use client";

import { useEffect, useState } from "react";

/** 주소 뒤의 #/이름 에서 선택된 사용자를 읽어요. (새로고침해도, 링크로 공유해도 유지) */
function readHash(): string | null {
  try {
    const v = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
    return v || null;
  } catch {
    return null;
  }
}

/** 선택된 사용자를 URL 해시와 동기화해요. 메인/현황/항목관리 화면이 공유해요. */
export function useSelectedUser() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setUser(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const selectUser = (name: string | null) => {
    window.location.hash = name ? `/${encodeURIComponent(name)}` : "";
  };

  return { user, selectUser };
}
