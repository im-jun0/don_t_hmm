"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, POLL_MS, TEXT } from "@/config";
import { fetchUsers } from "@/lib/api";
import { useSelectedUser } from "@/lib/useSelectedUser";
import HmmFace from "@/components/HmmFace";
import PatchNotes from "@/components/PatchNotes";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, selectUser } = useSelectedUser();
  const [users, setUsers] = useState<string[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchUsers().then((rows) => {
      if (!cancelled) setUsers(rows.map((r) => r.name));
    }).catch(() => {});
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-3">
          <Link
            href="/"
            onClick={() => selectUser(null)}
            className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight"
          >
            <HmmFace size={22} />
            {TEXT.appTitle}
          </Link>

          <div className="flex items-center gap-1">
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
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={
                        "block px-4 py-2 text-sm font-medium transition " +
                        (pathname === item.href
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50")
                      }
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>

        <nav
          aria-label="사용자 선택"
          className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 pb-3 pt-2"
        >
          {users.map((name) => {
            const on = name === user;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => selectUser(name)}
                className={
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 " +
                  (on
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")
                }
              >
                {name}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="pb-20 sm:pb-0">{children}</div>

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
              href={item.href}
              className={
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium " +
                (on ? "text-neutral-900" : "text-neutral-400")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
