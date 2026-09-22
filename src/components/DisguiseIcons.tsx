/**
 * 위장 테마를 채울 들러리 앱 아이콘들.
 *
 * Apple 의 실제 앱 아이콘 아트워크는 저작권 보호 대상이라 가져다 쓰지 않아요.
 * 대신 HIG 의 디자인 규칙만 따라 직접 그렸어요 —
 * 단색/그라디언트 배경 + 채워진 단순한 도형, 얇은 선과 텍스트는 피하기.
 * 새 아이콘을 추가하려면 DECOY_APPS 에 한 줄 넣으면 돼요.
 */

export type DecoyApp = {
  key: string;
  label: string;
  /** 아이콘 배경 (CSS background 값) */
  bg: string;
  /** 24x24 좌표계 안의 도형. 기본 색은 흰색이에요. */
  glyph: React.ReactNode;
  /** 진짜처럼 보이려고 몇 개엔 가짜 뱃지를 달아요. */
  badge?: number;
};

export const DECOY_APPS: DecoyApp[] = [
  {
    key: "phone",
    label: "전화",
    bg: "linear-gradient(180deg,#5ee27a,#1faf46)",
    glyph: (
      <path d="M7.2 3.6c.9-.9 2.4-.7 3 .4l1.5 2.5c.5.8.3 1.8-.4 2.4l-1 .9a9.6 9.6 0 0 0 3.9 3.9l.9-1c.6-.7 1.6-.9 2.4-.4l2.5 1.5c1.1.6 1.3 2.1.4 3l-1.1 1.1c-1 1-2.6 1.4-4 .9A18.6 18.6 0 0 1 5.4 8.7c-.5-1.4-.1-3 .9-4z" />
    ),
  },
  {
    key: "messages",
    label: "메시지",
    bg: "linear-gradient(180deg,#6ee787,#22c55e)",
    badge: 3,
    glyph: (
      <path d="M12 4.2c4.5 0 8.2 2.9 8.2 6.5s-3.7 6.5-8.2 6.5c-.9 0-1.8-.1-2.7-.4l-3.3 1.5c-.4.2-.8-.2-.6-.6l1-2.4c-1.4-1.2-2.2-2.8-2.2-4.6C4.2 7.1 7.9 4.2 12 4.2z" />
    ),
  },
  {
    key: "mail",
    label: "메일",
    bg: "linear-gradient(180deg,#63b3ff,#1a6dd8)",
    badge: 12,
    glyph: (
      <>
        <rect x="3.2" y="6.4" width="17.6" height="11.2" rx="2.4" />
        <path d="M4.6 8.1 12 13l7.4-4.9" fill="none" stroke="#2f7fe0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    key: "safari",
    label: "Safari",
    bg: "linear-gradient(180deg,#f2f6fa,#d7e3ef)",
    glyph: (
      <>
        <circle cx="12" cy="12" r="8.6" fill="#1f8fe0" />
        <circle cx="12" cy="12" r="7" fill="#f6fbff" />
        <path d="M15.8 8.2 10.9 11 8.2 15.8 13.1 13z" fill="#ff4d4f" />
        <path d="M10.9 11 8.2 15.8 13.1 13z" fill="#d9d9de" />
      </>
    ),
  },
  {
    key: "camera",
    label: "카메라",
    bg: "linear-gradient(180deg,#8e8e93,#48484a)",
    glyph: (
      <>
        <rect x="3" y="7" width="18" height="11.4" rx="2.8" />
        <path d="M9 5.4h6l1 1.6H8z" />
        <circle cx="12" cy="12.6" r="3.5" fill="#3a3a3c" />
        <circle cx="12" cy="12.6" r="2.2" fill="#8e8e93" />
      </>
    ),
  },
  {
    key: "photos",
    label: "사진",
    bg: "linear-gradient(180deg,#ffffff,#eceef2)",
    glyph: (
      <>
        <ellipse cx="12" cy="7.6" rx="2.2" ry="3.6" fill="#ffd23f" />
        <ellipse cx="12" cy="16.4" rx="2.2" ry="3.6" fill="#3ba9f5" />
        <ellipse cx="7.6" cy="12" rx="3.6" ry="2.2" fill="#ff6b6b" />
        <ellipse cx="16.4" cy="12" rx="3.6" ry="2.2" fill="#4ad07a" />
        <circle cx="12" cy="12" r="2" fill="#f7a63b" />
      </>
    ),
  },
  {
    key: "clock",
    label: "시계",
    bg: "linear-gradient(180deg,#2c2c2e,#000000)",
    glyph: (
      <>
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        <path d="M12 6.8V12l3.6 2.2" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.1" fill="#ff9f0a" />
      </>
    ),
  },
  {
    key: "weather",
    label: "날씨",
    bg: "linear-gradient(180deg,#4aa8ff,#1560c8)",
    glyph: (
      <>
        <circle cx="9.2" cy="9.4" r="3.2" fill="#ffd66b" />
        <path d="M8.6 18.4a3.6 3.6 0 0 1 .3-7.2 4.7 4.7 0 0 1 8.8 1.3 3 3 0 0 1-.6 5.9z" />
      </>
    ),
  },
  {
    key: "calculator",
    label: "계산기",
    bg: "linear-gradient(180deg,#3a3a3c,#1c1c1e)",
    glyph: (
      <>
        <rect x="5" y="4.6" width="14" height="5" rx="1.4" fill="#48484a" />
        <circle cx="7.6" cy="13" r="1.5" />
        <circle cx="12" cy="13" r="1.5" />
        <circle cx="16.4" cy="13" r="1.5" fill="#ff9f0a" />
        <circle cx="7.6" cy="17.4" r="1.5" />
        <circle cx="12" cy="17.4" r="1.5" />
        <circle cx="16.4" cy="17.4" r="1.5" fill="#ff9f0a" />
      </>
    ),
  },
  {
    key: "notes",
    label: "메모",
    bg: "linear-gradient(180deg,#fff3c4,#f7d774)",
    glyph: (
      <>
        <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="2.4" fill="#fffdf5" />
        <rect x="4.4" y="4.4" width="15.2" height="3.4" rx="1.6" fill="#e8b93c" />
        <path d="M7.2 11h9.6M7.2 14h9.6M7.2 17h6" stroke="#d8c48a" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: "reminders",
    label: "미리 알림",
    bg: "linear-gradient(180deg,#ffffff,#eceef2)",
    glyph: (
      <>
        <circle cx="7.4" cy="8" r="1.9" fill="#ff5f57" />
        <circle cx="7.4" cy="14" r="1.9" fill="#3ba9f5" />
        <circle cx="7.4" cy="19" r="1.9" fill="#f7a63b" />
        <path d="M11.4 8h7M11.4 14h7M11.4 19h5" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: "calendar",
    label: "캘린더",
    bg: "linear-gradient(180deg,#ffffff,#f0f0f3)",
    glyph: (
      <>
        <rect x="4.2" y="4.6" width="15.6" height="4.2" rx="1.6" fill="#ff453a" />
        <g fill="#c7c7cc">
          <circle cx="8" cy="12.6" r="1.3" />
          <circle cx="12" cy="12.6" r="1.3" />
          <circle cx="16" cy="12.6" r="1.3" />
          <circle cx="8" cy="16.8" r="1.3" />
          <circle cx="12" cy="16.8" r="1.3" fill="#ff453a" />
          <circle cx="16" cy="16.8" r="1.3" />
        </g>
      </>
    ),
  },
  {
    key: "maps",
    label: "지도",
    bg: "linear-gradient(180deg,#8fdc9a,#3fa860)",
    glyph: (
      <>
        <path d="M3 18.6c3.4-1 4.6-4.6 7.4-5.6 3-1 4.6 1.6 7.4.6l3.2-1.1v6.9H3z" fill="#bfe8c8" />
        <path d="M5.8 3.4 9 5v14.6l-3.2-1.6z" fill="#f2f7f3" />
        <path d="M9 5l3.4-1.6V18L9 19.6z" fill="#e2eee5" />
        <circle cx="16.4" cy="8.2" r="2.8" fill="#ff453a" />
      </>
    ),
  },
  {
    key: "music",
    label: "음악",
    bg: "linear-gradient(180deg,#fb6a80,#e5305c)",
    glyph: (
      <path d="M17.4 4.6a1 1 0 0 1 1.2 1v9.1a3 3 0 1 1-1.8-2.7V8.3l-6.6 1.5v7.3a3 3 0 1 1-1.8-2.7V7.4a1 1 0 0 1 .8-1z" />
    ),
  },
  {
    key: "appstore",
    label: "App Store",
    bg: "linear-gradient(180deg,#4fa8ff,#1b6ae0)",
    glyph: (
      <>
        <circle cx="12" cy="12" r="8.6" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.5" />
        <path d="M8.4 15.6 12 8.6l1.5 2.9M12.6 15.6h3.6M9.6 15.6h1.2" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    key: "health",
    label: "건강",
    bg: "linear-gradient(180deg,#ffffff,#f0f0f3)",
    glyph: (
      <path d="M12 19.4c-.4 0-.7-.1-1-.4l-5-4.8a4.7 4.7 0 0 1 6-7.1 4.7 4.7 0 0 1 6 7.1l-5 4.8c-.3.3-.6.4-1 .4z" fill="#ff375f" />
    ),
  },
  {
    key: "files",
    label: "파일",
    bg: "linear-gradient(180deg,#ffffff,#eef0f4)",
    glyph: (
      <path d="M3.6 8.2a2 2 0 0 1 2-2h3.2l1.7 2h7.9a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z" fill="#3ba9f5" />
    ),
  },
  {
    key: "wallet",
    label: "지갑",
    bg: "linear-gradient(180deg,#3a3a3c,#131315)",
    glyph: (
      <>
        <rect x="4.6" y="6" width="14.8" height="3.4" rx="1.4" fill="#4ad07a" />
        <rect x="4.6" y="9.6" width="14.8" height="3.4" rx="1.4" fill="#ffd23f" />
        <rect x="4.6" y="13.2" width="14.8" height="5.2" rx="1.8" fill="#ffffff" />
      </>
    ),
  },
  {
    key: "podcasts",
    label: "팟캐스트",
    bg: "linear-gradient(180deg,#c88bf0,#8b3fd4)",
    glyph: (
      <>
        <circle cx="12" cy="9.6" r="2.6" />
        <path d="M9.6 14.2h4.8l-1.1 5.2a1.4 1.4 0 0 1-2.6 0z" />
        <path d="M6.4 11.8a6 6 0 0 1 11.2 0" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },
  {
    key: "settings",
    label: "설정",
    bg: "linear-gradient(180deg,#b8b8bd,#6e6e73)",
    glyph: (
      <>
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="#ffffff" strokeWidth="1.7" />
        <path d="M12 3.6l1.5 1.9 2.3-.9.6 2.4 2.4.3-.5 2.4 2 1.4-1.6 1.9 1.1 2.2-2.3.9.1 2.4-2.4-.2-1.2 2.1-2-1.4-2 1.4-1.2-2.1-2.4.2.1-2.4-2.3-.9 1.1-2.2L3.7 12l2-1.4-.5-2.4 2.4-.3.6-2.4 2.3.9z" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
  },
];

/** 들러리 아이콘 한 장. 진짜 항목 타일과 같은 크기·모서리를 써요. */
export function DecoyIcon({ app, size = 60 }: { app: DecoyApp; size?: number }) {
  return (
    <span
      className="block rounded-[22%] shadow-sm ring-1 ring-black/10"
      style={{ width: size, height: size, background: app.bg }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden="true">
        {app.glyph}
      </svg>
    </span>
  );
}
