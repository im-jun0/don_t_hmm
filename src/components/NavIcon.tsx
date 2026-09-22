/**
 * 메뉴 아이콘. NAV 의 key 로 골라요. (HmmFace, 햄버거와 같은 선 하나 스타일)
 * 색은 글자색(currentColor)을 따라가요.
 */
const SHAPES: Record<string, React.ReactNode> = {
  // 현황 — 막대그래프
  stats: (
    <>
      <path d="M3 21h18" />
      <path d="M7 21v-6.5M12 21V6M17 21v-10" />
    </>
  ),
  // 랭킹 — 트로피
  ranking: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10.5M16 6h2.5A2.5 2.5 0 0 1 16 10.5" />
      <path d="M12 13v4" />
      <path d="M9.5 20h5l-1-3h-3z" />
    </>
  ),
  // 메인 — 집
  main: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M6 9.8V20h12V9.8" />
    </>
  ),
  // 게임 — 스톱워치 (30초 재기)
  game: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.5 1.5" />
      <path d="M9.5 2.5h5M12 2.5v3.5" />
    </>
  ),
  // 관리 — 슬라이더
  manage: (
    <>
      <path d="M4 7.5h9M19 7.5h1" />
      <path d="M4 16.5h1M11 16.5h9" />
      <circle cx="16" cy="7.5" r="2.5" />
      <circle cx="8" cy="16.5" r="2.5" />
    </>
  ),
};

export default function NavIcon({ name, size = 22 }: { name: string; size?: number }) {
  const shape = SHAPES[name];
  if (!shape) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
