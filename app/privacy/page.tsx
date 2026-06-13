import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${BRAND.name}는 100% 클라이언트 사이드로 동작하며, 촬영한 사진은 기기에서만 처리되고 서버에 저장되지 않습니다.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026년 6월 13일";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
      >
        {BRAND.name}
      </Link>

      <h1 className="mt-8 font-serif text-3xl tracking-tight text-neutral-900 dark:text-neutral-50">
        개인정보처리방침
      </h1>
      <p className="mt-2 text-sm text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

      <div className="mt-10 space-y-8 leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            1. 총칙
          </h2>
          <p>
            {BRAND.name}(이하 “서비스”)는 <strong>100% 클라이언트 사이드</strong>로
            동작합니다. 촬영·합성·다운로드 등 모든 처리가 이용자의 브라우저(기기)
            안에서 이루어지며, <strong>사진·영상 등 촬영 데이터는 서버로 전송되거나
            저장되지 않습니다.</strong> 서비스는 별도의 회원가입, 로그인, 결제 기능을
            제공하지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            2. 수집하는 개인정보 항목
          </h2>
          <p>
            서비스는 이용자를 식별할 수 있는 개인정보(이름, 연락처, 이메일 등)를 수집하지
            않습니다. 촬영한 사진은 서버에 업로드되지 않으며, 이용자가 직접 다운로드를
            실행할 때에만 해당 이미지가 이용자의 기기에 저장됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            3. 카메라 및 미디어 접근
          </h2>
          <p>
            촬영을 위해 브라우저의 카메라 접근 권한(getUserMedia)이 필요합니다. 카메라
            영상은 화면 미리보기와 4컷 합성을 위해 <strong>기기 내에서만</strong>
            사용되며, 외부로 전송되지 않습니다. 권한은 브라우저 설정에서 언제든지 철회할
            수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            4. 쿠키 및 분석 도구
          </h2>
          <p>
            서비스는 이용 현황 분석 및 품질 개선을 위해 Google Analytics를 사용할 수
            있습니다. 이 경우 Google이 쿠키 등을 통해 <strong>비식별 이용 통계</strong>
            (방문 페이지, 기기·브라우저 정보, 대략적 위치 등)를 수집·처리하며, 자세한
            사항은 Google의 개인정보처리방침을 따릅니다. <strong>촬영한 사진·영상은 분석
            도구로 전송되지 않습니다.</strong> 이용자는 브라우저 설정이나 Google의
            차단 도구로 분석 쿠키를 거부할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            5. 제3자 제공 및 외부 리소스
          </h2>
          <p>
            서비스는 개인정보를 제3자에게 제공하지 않습니다. 다만 화면 표시를 위해 글꼴
            등 정적 리소스를 외부 CDN에서 불러올 수 있으며, 이 과정에서 표준 웹 요청에
            수반되는 정보(예: IP 주소) 외의 개인정보는 처리되지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            6. 보관 및 파기
          </h2>
          <p>
            서비스는 촬영 데이터를 서버에 보관하지 않으므로 별도의 파기 절차가 없습니다.
            기기에 저장된 결과물의 관리·삭제는 이용자가 직접 수행합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            7. 이용자의 권리
          </h2>
          <p>
            서비스는 개인정보를 수집·보관하지 않으므로 열람·정정·삭제 대상 데이터가
            존재하지 않습니다. 카메라 권한 등 기기 권한은 이용자가 브라우저에서 직접
            제어할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            8. 문의처
          </h2>
          <p>
            개인정보 처리에 관한 문의는 운영자 연락처(추후 기재)로 접수할 수 있습니다.
          </p>
        </section>

        <p className="border-t border-black/5 pt-6 text-xs text-neutral-400 dark:border-white/10">
          ※ 본 문서는 일반적인 참고용 초안이며 법률 자문을 대체하지 않습니다. 실제 운영 전
          법률 검토를 권장합니다.
        </p>
      </div>
    </main>
  );
}
