// app/layout.tsx (抜粋)
export const metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recta",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // これが全画面のカギです
};