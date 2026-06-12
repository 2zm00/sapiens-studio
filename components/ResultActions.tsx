"use client";

import { useCallback, useState } from "react";
import {
  canvasToPngBlob,
  downloadBlob,
  stripFilename,
} from "@/lib/compose";

export interface ResultActionsProps {
  /** renderStrip()이 반환한 1060×3187 캔버스 */
  stripCanvas: HTMLCanvasElement;
  /** 파일명 타임스탬프에 사용할 촬영 시각 */
  capturedAt?: Date;
}

/**
 * 결과 다운로드 버튼. M3는 단일 스트립(1060×3187)만 제공.
 * 4×6 인쇄용(2120×3187)은 M5에서 추가한다.
 */
export default function ResultActions({
  stripCanvas,
  capturedAt,
}: ResultActionsProps) {
  const [busy, setBusy] = useState(false);

  const downloadSingle = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await canvasToPngBlob(stripCanvas);
      downloadBlob(blob, stripFilename(capturedAt));
    } finally {
      setBusy(false);
    }
  }, [stripCanvas, capturedAt]);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={downloadSingle}
        disabled={busy}
        data-testid="download-single"
        className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "준비 중…" : "단일 스트립 다운로드 (1060×3187)"}
      </button>
    </div>
  );
}
