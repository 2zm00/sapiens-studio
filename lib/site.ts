/**
 * 사이트 URL 단일 소스. 실제 도메인은 .env(.local)의 NEXT_PUBLIC_SITE_URL로 주입.
 * metadataBase / robots / sitemap / canonical / OG가 공유한다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
