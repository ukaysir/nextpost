import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { CanonicalAuthRedirect } from "@/components/canonical-auth-redirect";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXTPOST",
  description: "전역 군 간부를 위한 AI 기반 방산 커리어 분석 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        <CanonicalAuthRedirect />
        {children}
      </body>
    </html>
  );
}
