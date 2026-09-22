"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, TEXT } from "@/config";
import { useAuth } from "@/lib/useAuth";
import { useSelectedUser } from "@/lib/useSelectedUser";
import AuthMenu from "@/components/AuthMenu";
import HmmFace from "@/components/HmmFace";
import NavIcon from "@/components/NavIcon";
import LoginScreen from "@/components/LoginScreen";
import PatchNotes from "@/components/PatchNotes";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, selectUser } = useSelectedUser();
  const { status: authStatus, me, displayName } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 헤더에 backdrop-blur 가 있어서 fixed 오버레이로 바깥 클릭을 감지하면
  // 뷰포트가 아니라 헤더 박스 기준으로 좁게 걸려요. 문서 클릭 리스너로 대신해요.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // 로그인한 사람의 이름을 해시(#/이름)에 넣어줘요. 화면들은 예전처럼 해시만 보면 돼요.
  // 이미 다른 이름이 들어있으면(항목관리에서 고른 경우) 건드리지 않아요.
  useEffect(() => {
    if (authStatus === "ready" && me && !user) selectUser(me.name);
  }, [authStatus, me, user, selectUser]);

  // 메뉴로 이동할 때 선택된 사람(#/이름)을 같이 들고 다녀요.
  // 안 붙이면 이동하는 순간 해시가 날아가서 "누구 화면인지"를 잃고 빈 화면이 잠깐 보여요.
  const navHash = user ? `#/${encodeURIComponent(user)}` : "";

  // 로그인 콜백은 세션을 만드는 중이라 로그인 화면으로 되돌리면 안 돼요.
  if (pathname === "/auth/callback") return <>{children}</>;

  // 로그인 전에는 헤더도 탭바도 없이 로그인 화면만 보여요.
  if (authStatus === "loading") return <div className="min-h-screen bg-white" />;
  if (authStatus === "signedOut") return <LoginScreen />;

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link
            href="/"
            onClick={() => selectUser(null)}
            className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight"
          >
            <HmmFace size={22} />
            {TEXT.appTitle}
          </Link>

          <div className="flex items-center gap-1">
            <AuthMenu displayName={displayName} />
            <PatchNotes />

            {/* 데스크톱: 햄버거 메뉴 */}
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                type="button"
                aria-label="메뉴"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                  <path d="M2 5h14M2 9h14M2 13h14" />
                </svg>
              </button>
              {menuOpen && (
                <nav className="absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  {NAV.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href + navHash}
                      onClick={() => setMenuOpen(false)}
                      className={
                        "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition " +
                        (pathname === item.href
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50")
                      }
                    >
                      <NavIcon name={item.key} size={17} />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 탭바(60px)에 가리지 않게 띄워요. 홈 인디케이터 영역만큼 더 내려줘요. */}
      <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</div>

      {/* 모바일: 하단 탭바 */}
      <nav
        aria-label="메뉴"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-100 bg-white/95 backdrop-blur sm:hidden"
      >
        {NAV.map((item) => {
          const on = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href + navHash}
              aria-current={on ? "page" : undefined}
              // 손가락으로 눌러야 해서 한 칸을 60px 이상으로 잡아요. (iOS 권장 최소는 44px)
              className={
                "flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium active:bg-neutral-100 " +
                (on ? "text-neutral-900" : "text-neutral-400")
              }
            >
              <NavIcon name={item.key} size={23} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
