"use client";

import { useCallback, useState } from "react";
import {
  canvasToPngBlob,
  downloadBlob,
  printFilename,
  renderPrint4x6,
  stripFilename,
} from "@/lib/compose";

function DownloadIcon() {
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
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

export interface ResultActionsProps {
  /** renderStrip()이 반환한 1060×3187 캔버스 */
  stripCanvas: HTMLCanvasElement;
  /** 파일명 타임스탬프에 사용할 촬영 시각 */
  capturedAt?: Date;
}

/**
 * 결과 다운로드 버튼.
 * - 단일 스트립: 1060×3187
 * - 4×6 인쇄용: 2120×3187 (동일 스트립 좌우 2장)
 */
export default function ResultActions({
  stripCanvas,
  capturedAt,
}: ResultActionsProps) {
  const [busy, setBusy] = useState<"single" | "print" | null>(null);

  const downloadSingle = useCallback(async () => {
    setBusy("single");
    try {
      const blob = await canvasToPngBlob(stripCanvas);
      downloadBlob(blob, stripFilename(capturedAt));
    } finally {
      setBusy(null);
    }
  }, [stripCanvas, capturedAt]);

  const downloadPrint = useCallback(async () => {
    setBusy("print");
    try {
      const blob = await canvasToPngBlob(renderPrint4x6(stripCanvas));
      downloadBlob(blob, printFilename(capturedAt));
    } finally {
      setBusy(null);
    }
  }, [stripCanvas, capturedAt]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        onClick={downloadSingle}
        disabled={busy !== null}
        data-testid="download-single"
        className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-white"
      >
        <DownloadIcon />
        {busy === "single" ? "준비 중…" : "스트립 · 1060×3187"}
      </button>
      <button
        onClick={downloadPrint}
        disabled={busy !== null}
        data-testid="download-print"
        className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-white"
      >
        <DownloadIcon />
        {busy === "print" ? "준비 중…" : "인쇄용 4×6 · 2120×3187"}
      </button>
    </div>
  );
}
