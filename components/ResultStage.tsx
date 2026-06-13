"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import ResultActions from "./ResultActions";
import {
  canvasToPngBlob,
  cutFilename,
  downloadBlob,
  formatDate,
} from "@/lib/compose";
import { BRAND } from "@/lib/brand";
import type { FrameTemplate } from "@/types";

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

/** ImageBitmap을 4:3 박스에 cover 크롭으로 그려주는 컷 썸네일 */
function CutThumb({ bitmap }: { bitmap: ImageBitmap }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const scale = Math.max(W / bitmap.width, H / bitmap.height);
    const cw = W / scale;
    const ch = H / scale;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(
      bitmap,
      (bitmap.width - cw) / 2,
      (bitmap.height - ch) / 2,
      cw,
      ch,
      0,
      0,
      W,
      H,
    );
  }, [bitmap]);
  return <canvas ref={ref} width={320} height={240} className="h-full w-full object-cover" />;
}

export interface ResultStageProps {
  template: FrameTemplate;
  /** 합성 스트립 PNG의 blob URL */
  stripPreviewUrl: string;
  /** renderStrip()이 반환한 1060×3187 캔버스 */
  stripCanvas: HTMLCanvasElement;
  /** 촬영된 4개 원본 컷(개별 다운로드용) */
  photos: ImageBitmap[];
  capturedAt: Date;
  onRestart: () => void;
}

/**
 * 촬영 후 결과/다운로드 화면(M8 — Stitch 시안을 React로 이식).
 * 좌: 세션 메타 + 다운로드 버튼 / 우: 스트립 쇼케이스 / 하: 개별 컷.
 * 합성/export 로직(M1~M3)은 변경하지 않고 표현만 재구성.
 */
export default function ResultStage({
  template,
  stripPreviewUrl,
  stripCanvas,
  photos,
  capturedAt,
  onRestart,
}: ResultStageProps) {
  const dateText = formatDate(capturedAt);

  const downloadCut = useCallback(
    async (bitmap: ImageBitmap, index: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, cutFilename(index, capturedAt));
    },
    [capturedAt],
  );

  const downloadAllCuts = useCallback(async () => {
    for (let i = 0; i < photos.length; i++) {
      await downloadCut(photos[i], i);
    }
  }, [photos, downloadCut]);

  return (
    <section className="relative w-full">
      {/* 배경은 전역(body)의 이리데센트 그라데이션을 그대로 사용 */}
      <div className="mx-auto w-full max-w-5xl px-1 py-2 sm:px-2">
        {/* 브랜드 / 상태 라벨 */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg tracking-tight text-neutral-900 transition-opacity hover:opacity-70 dark:text-neutral-100"
          >
            {BRAND.name}
          </Link>
        </div>

        <div className="flex flex-col gap-12 md:flex-row md:items-center">
          {/* 좌: 메타 + 액션 */}
          <div className="flex w-full flex-col gap-8 md:w-5/12">
            <div className="space-y-4">
              <h1 className="font-serif text-4xl leading-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">
                Sapiens Studio
                <br />
                Archive
              </h1>
              <dl className="mt-4 border-l-2 border-neutral-300 pl-4 dark:border-neutral-600">
                <dt className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Date
                </dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{dateText}</dd>
                <dt className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Frame
                </dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{template.name}</dd>
              </dl>
            </div>

            <div className="border-t border-neutral-300/60 pt-8 dark:border-neutral-700/60">
              <ResultActions stripCanvas={stripCanvas} capturedAt={capturedAt} />
            </div>

            <button
              onClick={onRestart}
              className="liquid-glass inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-neutral-700 dark:text-neutral-200"
            >
              <RestartIcon />
              다시 만들기
            </button>
          </div>

          {/* 우: 스트립 쇼케이스 (실제 합성 결과, 세로 1060:3187 비율) */}
          <div className="flex w-full justify-center md:w-7/12">
            <figure className="film-strip-shadow w-full max-w-[300px] rotate-1 bg-white p-3 shadow-sm ring-1 ring-black/5 transition-transform duration-500 ease-out hover:rotate-0">
              {/* 스트립 자체에 브랜드 워터마크·날짜가 합성돼 있으므로 별도 캡션을 두지 않는다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripPreviewUrl}
                alt="합성된 네컷 스트립"
                className="block w-full"
              />
            </figure>
          </div>
        </div>

        {/* 하: 개별 컷 */}
        <div className="mt-16 border-t border-neutral-300/60 pt-12 dark:border-neutral-700/60">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50">
                개별 컷
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                컷마다 원본 해상도 PNG로 따로 저장할 수 있어요.
              </p>
            </div>
            {photos.length > 0 && (
              <button
                onClick={downloadAllCuts}
                className="liquid-glass hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-900 sm:inline-flex dark:text-neutral-100"
              >
                컷 전체 저장
                <DownloadIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {photos.map((bitmap, i) => (
              <figure
                key={i}
                className="group relative border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-neutral-900"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <CutThumb bitmap={bitmap} />
                  <button
                    onClick={() => downloadCut(bitmap, i)}
                    aria-label={`${i + 1}번 컷 다운로드`}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
                  >
                    <DownloadIcon className="h-6 w-6" />
                  </button>
                </div>
                <figcaption className="mt-2 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                  Cut_0{i + 1}
                </figcaption>
              </figure>
            ))}
          </div>

          {photos.length > 0 && (
            <button
              onClick={downloadAllCuts}
              className="liquid-glass mt-8 flex w-full items-center justify-center gap-2 rounded-full py-4 text-xs font-medium uppercase tracking-widest text-neutral-900 sm:hidden dark:text-white"
            >
              컷 전체 저장
              <DownloadIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
