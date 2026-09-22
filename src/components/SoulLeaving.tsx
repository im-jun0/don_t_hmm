/**
 * 영혼이 빠져나간 사람 일러스트 (HmmFace 와 같은 선 하나 스타일)
 * 색은 글자색(currentColor)을 따라가요.
 */
export default function SoulLeaving({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size * 150) / 120}
      viewBox="0 0 120 150"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* 빠져나간 영혼 */}
      <g opacity="0.5">
        <path d="M44 40a16 16 0 0 1 32 0v20c0 2.2-2.4 3.3-3.9 1.7L69 59l-3.3 3.2c-1 1-2.7 1-3.7 0L58.7 59l-3.3 3.2c-1 1-2.7 1-3.7 0L48.4 59l-1.5 1.6C45.4 62.2 44 61.3 44 59.6z" />
        <circle cx="53" cy="38" r="2.3" fill="currentColor" stroke="none" />
        <circle cx="67" cy="38" r="2.3" fill="currentColor" stroke="none" />
        <path d="M56.5 47q3.5 3.5 7 0" />
      </g>

      {/* 빠져나가는 중 (아래에서 위로 옅어져요) */}
      <circle cx="60" cy="90" r="3" fill="currentColor" stroke="none" opacity="0.4" />
      <circle cx="60" cy="81" r="2.4" fill="currentColor" stroke="none" opacity="0.3" />
      <circle cx="60" cy="73" r="1.8" fill="currentColor" stroke="none" opacity="0.2" />

      {/* 남겨진 몸 */}
      <circle cx="60" cy="110" r="15" />
      {/* 감긴 눈 */}
      <path d="M52 108h5M63 108h5" />
      {/* 넋 나간 입 */}
      <path d="M56.5 119q3.5-3 7 0" />
      {/* 축 처진 어깨 */}
      <path d="M33 147c0-13 12-22 27-22s27 9 27 22" />
    </svg>
  );
}
