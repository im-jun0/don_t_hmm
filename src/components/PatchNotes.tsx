"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CURRENT_VERSION, PATCH_NOTES } from "@/config";

const STORAGE_KEY = "dh_seen_version";

/** 헤더 벨 아이콘 + 패치노트 모달. 새 버전이면 자동으로 한 번 열리고 뱃지가 떠요. */
export default function PatchNotes() {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);
  // 헤더에 backdrop-blur 가 있어서 fixed 오버레이를 그 안에 두면 뷰포트가 아니라
  // 헤더 박스 기준으로 배치돼요. body 로 포탈해서 피해요.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등)면 그냥 무시해요
    }
    if (seen !== CURRENT_VERSION) {
      setUnseen(true);
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    setUnseen(false);
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="패치노트"
        onClick={() => setOpen(true)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8.5c0-3 1.8-5 5-5s5 2 5 5c0 3.2 1 4.3 1 4.3H3s1-1.1 1-4.3Z" />
          <path d="M7.3 15a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {unseen && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
            onClick={close}
          >
            <div
              className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">패치노트</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="닫기"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-5">
                {PATCH_NOTES.map((note) => (
                  <div key={note.version}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">v{note.version}</span>
                      <span className="text-xs text-neutral-400">{note.date}</span>
                    </div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-neutral-600">
                      {note.items.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
