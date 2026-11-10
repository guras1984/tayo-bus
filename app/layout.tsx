import type { Metadata, Viewport } from "next";
import "./globals.css";
import {AppInstallProvider} from '../components/app-install';

export const metadata: Metadata = {
  title: "타요 · 버스 도착 정보",
  description: "지역을 선택하고 내 정류장의 버스 도착 정보를 확인하세요.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "타요", statusBarStyle: "default" },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#c9e8fa" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased"><AppInstallProvider>{children}</AppInstallProvider></body>
    </html>
  );
}
