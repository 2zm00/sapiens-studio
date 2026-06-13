import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** 전 페이지 공용 하단 푸터 — 브랜드·법적 링크·클라이언트 사이드 고지. */
export default function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-black/5 px-6 py-8 text-center text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
        <span className="font-serif text-sm tracking-tight text-neutral-700 dark:text-neutral-200">
          {BRAND.name}
        </span>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100">
            이용약관
          </Link>
          <span aria-hidden className="text-neutral-300 dark:text-neutral-600">·</span>
          <Link href="/privacy" className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100">
            개인정보처리방침
          </Link>
        </nav>
        <p className="max-w-md text-[11px] leading-relaxed text-neutral-400">
          사진은 기기(브라우저)에서만 처리되며 서버에 저장되지 않습니다.
        </p>
        <p className="text-[11px] text-neutral-400">
          © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}
        </p>
      </div>
    </footer>
  );
}
