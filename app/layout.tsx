// app/layout.tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Recta",
  description: "Seamless Gallery",
  // これが重要：ホーム画面に追加した時にアドレスバーを消す
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 勝手にズームするのを防ぐ
  viewportFit: "cover", // iPhoneのノッチ部分まで背景を広げる
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}