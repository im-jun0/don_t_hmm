"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const pathname = usePathname();

  // pathname 이 의존성에 꼭 있어야 해요.
  // 메뉴를 누르면 Next.js 가 history API 로 이동하는데, 그때 주소의 해시는 사라지지만
  // hashchange 는 안 터져요. 그래서 이 훅이 화면 밖(AppShell)에 계속 떠 있으면
  // 이미 없어진 이름을 그대로 들고 있게 돼요. 경로가 바뀔 때마다 주소를 다시 읽어요.
  useEffect(() => {
    const sync = () => setUser(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  // AppShell 이 effect 안에서 쓰기 때문에 렌더마다 새로 만들어지지 않게 고정해요.
  const selectUser = useCallback((name: string | null) => {
    window.location.hash = name ? `/${encodeURIComponent(name)}` : "";
  }, []);

  return { user, selectUser };
}
