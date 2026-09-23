import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { TEXT } from "@/config";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: TEXT.appTitle,
  description: "안 했으면 하는 행동을 세어봐요.",
  // 아이폰에서 알림을 받으려면 홈 화면에 추가해서 열어야 해요. 그때 필요한 설정들이에요.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: TEXT.appTitle, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
