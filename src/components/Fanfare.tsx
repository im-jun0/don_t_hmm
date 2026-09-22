"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#fde047", "#fb7185", "#60a5fa", "#4ade80", "#c084fc", "#fb923c"];
const PIECES = 48;
const DURATION_MS = 3000;

/**
 * 짧은 팡파레를 그 자리에서 만들어서 울려요. (도-미-솔-도)
 * 음원 파일을 들고 다니지 않으려고 오실레이터로 직접 소리를 내요.
 * 브라우저가 소리를 막으면 그냥 조용히 넘어가요 — 색종이는 어차피 날리니까요.
 */
function playFanfare() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime + 0.02;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = start + i * 0.11;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* 소리는 못 내도 괜찮아요 */
  }
}

/** 탑3 진입 축하. 색종이 + 팡파레를 한 번 보여주고 스스로 사라져요. */
export default function Fanfare({ title, subtitle }: { title: string; subtitle: string }) {
  const [done, setDone] = useState(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        drift: `${(Math.random() - 0.5) * 30}vw`,
        duration: `${1.8 + Math.random() * 1.4}s`,
        delay: `${Math.random() * 0.5}s`,
        color: COLORS[i % COLORS.length],
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8,
      })),
    []
  );

  useEffect(() => {
    playFanfare();
    const t = window.setTimeout(() => setDone(true), DURATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done || typeof document === "undefined") return null;

  // 헤더의 backdrop-blur 안에 fixed 를 두면 헤더 박스에 갇혀요. body 로 빼요.
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="hc-confetti absolute top-0 block rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              "--drift": p.drift,
              "--dur": p.duration,
              animationDelay: p.delay,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="hc-congrats absolute inset-x-0 top-24 flex justify-center px-5">
        <div className="rounded-2xl bg-neutral-900/90 px-5 py-3 text-center text-white shadow-lg">
          <p className="break-keep text-[15px] font-semibold">🎉 {title}</p>
          <p className="mt-0.5 break-keep text-xs opacity-70">{subtitle}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
