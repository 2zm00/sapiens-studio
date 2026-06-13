import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${BRAND.name} 서비스 이용약관.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026년 6월 13일";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="font-serif text-lg tracking-tight transition-opacity hover:opacity-70"
      >
        {BRAND.name}
      </Link>

      <h1 className="mt-8 font-serif text-3xl tracking-tight text-neutral-900 dark:text-neutral-50">
        이용약관
      </h1>
      <p className="mt-2 text-sm text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

      <div className="mt-10 space-y-8 leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제1조 (목적)
          </h2>
          <p>
            본 약관은 {BRAND.name}(이하 “서비스”)가 제공하는 웹 기반 인생네컷(세로 4컷
            스트립) 포토부스 서비스의 이용 조건과 절차, 이용자와 서비스의 권리·의무를
            규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제2조 (서비스 내용)
          </h2>
          <p>
            서비스는 이용자의 웹캠으로 4컷을 촬영하고, 선택한 프레임 템플릿에 합성하여
            이미지(PNG)로 다운로드하는 기능을 제공합니다. 모든 처리(촬영·합성·다운로드)는
            이용자의 브라우저(기기) 내에서 이루어지며, 별도의 회원가입이나 결제가 없는 무료
            서비스입니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제3조 (이용 및 카메라 권한)
          </h2>
          <p>
            이용자는 별도의 가입 없이 서비스를 이용할 수 있습니다. 촬영을 위해 브라우저의
            카메라 접근 권한이 필요하며, 해당 권한은 촬영 목적에만 사용됩니다. 권한 허용
            여부는 이용자가 직접 결정합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제4조 (콘텐츠와 저작권)
          </h2>
          <p>
            이용자가 촬영하여 생성한 사진·스트립 결과물에 대한 권리는 이용자에게 귀속됩니다.
            서비스가 제공하는 프레임 템플릿, 디자인, 로고, 상표 등에 대한 권리는 서비스
            제공자 또는 정당한 권리자에게 있으며, 이용자는 이를 무단으로 복제·배포·상업적
            이용할 수 없습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제5조 (금지 행위)
          </h2>
          <p>
            이용자는 (1) 타인의 권리(초상권·저작권 등)를 침해하는 행위, (2) 관련 법령에
            위반되거나 공공질서·미풍양속에 반하는 콘텐츠를 생성·유포하는 행위, (3) 서비스의
            정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제6조 (면책 및 무보증)
          </h2>
          <p>
            서비스는 “있는 그대로(as-is)” 제공됩니다. 서비스는 특정 목적에의 적합성,
            중단·오류 없는 동작, 기기·브라우저 호환성을 보증하지 않습니다. 이용자의 기기,
            브라우저 설정, 카메라 환경에 따라 일부 기능이 제한될 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제7조 (책임의 제한)
          </h2>
          <p>
            서비스 제공자는 관련 법령이 허용하는 범위에서, 이용자가 서비스를 이용하며 발생한
            직·간접적 손해에 대하여 책임을 지지 않습니다. 결과물의 저장·백업 책임은 이용자에게
            있습니다(결과물은 서버에 보관되지 않습니다).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제8조 (약관의 변경)
          </h2>
          <p>
            서비스는 필요한 경우 본 약관을 변경할 수 있으며, 변경 시 본 페이지를 통해
            공지합니다. 변경된 약관은 공지 시점부터 효력이 발생합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제9조 (준거법 및 분쟁 해결)
          </h2>
          <p>
            본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은 관련 법령이
            정한 절차에 따릅니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            제10조 (문의)
          </h2>
          <p>본 약관에 관한 문의는 운영자 연락처(추후 기재)로 접수할 수 있습니다.</p>
        </section>

        <p className="border-t border-black/5 pt-6 text-xs text-neutral-400 dark:border-white/10">
          ※ 본 문서는 일반적인 참고용 초안이며 법률 자문을 대체하지 않습니다. 실제 운영 전
          법률 검토를 권장합니다.
        </p>
      </div>
    </main>
  );
}
