import "./globals.css"; // ← これがデザインを復活させる魔法の1行です！
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Recta",
  description: "Seamless Gallery",
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
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}