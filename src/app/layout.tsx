import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Shorts Agent | 유튜브 쇼츠 자동화 파이프라인",
  description: "AI로 만드는 스마트 유튜브 쇼츠 파이프라인",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
