"use client";
// TEMPPREVIEW — 위장 테마 확인용. 지울 파일.
import { useState } from "react";
import DisguiseHome from "@/components/DisguiseHome";

export default function DisguisePreview() {
  const [exited, setExited] = useState(false);
  if (exited) return <main className="p-10 text-sm">설정 눌러서 빠져나옴</main>;
  return <DisguiseHome onExit={() => setExited(true)} />;
}
