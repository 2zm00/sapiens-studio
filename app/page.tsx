import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { templates } from "@/lib/templates";
import type { FrameTemplate } from "@/types";

/**
 * 완성 스트립 예시를 템플릿 데이터(배경색·슬롯 좌표·오버레이 색)에서 파생해 CSS만으로 그린 목업.
 * 실제 슬롯 좌표(1060×3187 좌표계)를 퍼센트로 절대배치해 규격 비율을 정확히 재현(오버플로 없음).
 */
function SampleStrip({ template }: { template: FrameTemplate }) {
  const W = template.canvasWidth;
  const H = template.canvasHeight;
  const logoColor = template.overlays?.[0]?.color ?? "#111";
  const dateColor = template.overlays?.[1]?.color ?? "#888";
  return (
    <div
      className="relative w-28 shrink-0 overflow-hidden rounded-md shadow-md ring-1 ring-black/5 sm:w-32"
      style={{ aspectRatio: `${W} / ${H}`, background: template.background.value }}
      aria-hidden
    >
      {template.slots.map((s) => (
        <div
          key={s.id}
          className="absolute"
          style={{
            left: `${(s.x / W) * 100}%`,
            top: `${(s.y / H) * 100}%`,
            width: `${(s.width / W) * 100}%`,
            height: `${(s.height / H) * 100}%`,
            borderRadius: s.borderRadius ? `${(s.borderRadius / W) * 100}%` : undefined,
            backgroundColor: "rgba(140,140,150,0.35)",
          }}
        />
      ))}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ top: `${(3040 / H) * 100}%` }}
      >
        <span className="text-[7px] font-bold tracking-wide" style={{ color: logoColor }}>
          {BRAND.name}
        </span>
        <span className="text-[6px]" style={{ color: dateColor }}>
          2026.06.13
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  { n: "①", title: "프레임 선택", desc: "원하는 테마를 고르세요." },
  { n: "②", title: "카메라 권한 설정, 4컷 촬영", desc: "카운트다운에 맞춰 찰칵." },
  { n: "③", title: "다운로드", desc: "인쇄 규격 PNG로 저장." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* 모바일 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 p-4 sm:hidden">
        <Link
          href="/booth"
          className="liquid-glass block w-full rounded-full py-3 text-center text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-white"
        >
          촬영 시작하기
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-20 px-6 py-16 pb-28 sm:pb-16">
        {/* 히어로 */}
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">
            Web Photo Studio
          </p>
          <h1 className="font-serif text-5xl tracking-tight text-neutral-900 sm:text-6xl dark:text-neutral-50">
            {BRAND.name}
          </h1>
          <p className="max-w-md whitespace-pre-line text-balance text-lg text-neutral-600 dark:text-neutral-300">
            {BRAND.tagline}.<br />
            언제 어디서나 소중한 순간을 담는 셀프 스튜디오입니다.
          </p>
          <Link
            href="/booth"
            className="liquid-glass hidden rounded-full px-10 py-4 text-xs font-medium uppercase tracking-widest text-neutral-900 sm:inline-block dark:text-white"
          >
            촬영 시작하기
          </Link>
        </section>

        {/* 샘플 미리보기 */}
        <section className="flex w-full flex-col items-center gap-6">
          <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50">
            이런 결과물이 나와요
          </h2>
          <div className="flex flex-wrap justify-center gap-5">
            {templates.map((t) => (
              <figure key={t.id} className="flex flex-col items-center gap-2">
                <SampleStrip template={t} />
                <figcaption className="text-sm text-zinc-500">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 사용법 3스텝 */}
        <section className="flex w-full flex-col items-center gap-8">
          <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50">
            이렇게 사용해요
          </h2>
          <ol className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-6 text-center shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/80 dark:ring-white/10"
              >
                <span className="font-serif text-3xl text-neutral-400">{s.n}</span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
