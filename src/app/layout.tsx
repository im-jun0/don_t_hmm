import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TEXT } from "@/config";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: TEXT.appTitle,
  description: "안 했으면 하는 행동을 세어봐요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
