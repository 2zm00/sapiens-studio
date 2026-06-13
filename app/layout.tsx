/* eslint-disable @next/next/no-page-custom-font --
   App Router 루트 레이아웃의 <head> <link>는 전 페이지에 적용되며,
   next/font는 한국어 웹폰트(Pretendard/Noto Serif KR)를 깔끔히 로드하기 어려워 CDN으로 로드한다. */
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

const TITLE = "Sapiens Studio - 웹캠 4컷 인생네컷 사진";
const DESCRIPTION =
  "설치·회원가입 없이 웹캠으로 4컷을 찍고, 다양한 테마 프레임에 담아 고해상도(인쇄용 4×6) PNG로 만들 수 있는 온라인 셀프 포토부스입니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${BRAND.name}`,
  },
  description: DESCRIPTION,
  keywords: [
    "인생네컷",
    "온라인 인생네컷",
    "네컷사진 만들기",
    "무료 인생네컷",
    "웹 인생네컷",
    "셀프 네컷",
    "인생네컷 사이트",
    "인생네컷 프레임",
    "포토부스",
  ],
  applicationName: BRAND.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
  // Search Console 사이트 확인: NEXT_PUBLIC_GSC_VERIFICATION 있을 때만 메타 출력
  verification: GSC_VERIFICATION ? { google: GSC_VERIFICATION } : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 한글+영문 통일 글꼴: Pretendard(sans) + Noto Serif KR(serif) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <SiteFooter />
      </body>
      {/* GA4: NEXT_PUBLIC_GA_ID 있을 때만 주입 */}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
