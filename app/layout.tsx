import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} | Web photo booth`,
  description: `${BRAND.name} — 웹캠으로 4컷 사진을 찍고 다양한 프레임에 담아 인쇄 규격(PNG)으로 무료로 다운로드하세요. 설치 없이 브라우저에서 바로 이용 가능한 온라인 인생네컷 포토부스.`,
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary",
    title: BRAND.name,
    description: BRAND.tagline,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
