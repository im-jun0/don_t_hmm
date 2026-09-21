/**
 * 질려하는 얼굴 일러스트 (선 하나로 그린 심플 SVG)
 * 색은 글자색(currentColor)을 따라가요.
 */
export default function HmmFace({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* 얼굴 */}
      <circle cx="50" cy="52" r="38" />
      {/* 반쯤 감긴 눈꺼풀 */}
      <path d="M25 46h17M58 46h17" />
      {/* 옆으로 흘겨보는 눈동자 */}
      <circle cx="38" cy="52" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="71" cy="52" r="2.6" fill="currentColor" stroke="none" />
      {/* 삐뚤한 입 */}
      <path d="M36 72q7-6 14 0t14 0" />
      {/* 식은땀 */}
      <path d="M88 18c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" strokeWidth={3} />
    </svg>
  );
}
