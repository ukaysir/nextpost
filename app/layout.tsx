import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXTPOST",
  description: "전역 간부를 위한 AI 기반 방산 커리어 인텔리전스 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
