"use client";

import { useCallback, useState } from "react";
import {
  canvasToPngBlob,
  downloadBlob,
  renderStrip,
  stripFilename,
} from "@/lib/compose";
import { templates } from "@/lib/templates";

const DUMMY_COLORS = ["#E76F51", "#2A9D8F", "#E9C46A", "#264653"];

/** 웹캠 대신 쓰는 1920×1080 더미 컷 — 중앙 십자선과 테두리로 cover 크롭 위치를 육안 확인 */
function makeDummyPhoto(index: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = DUMMY_COLORS[index % DUMMY_COLORS.length];
  ctx.fillRect(0, 0, 1920, 1080);

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1908, 1068);

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(960, 0);
  ctx.lineTo(960, 1080);
  ctx.moveTo(0, 540);
  ctx.lineTo(1920, 540);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 400px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), 960, 540);

  return canvas;
}

interface TestResult {
  previewUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export default function StripTestPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const photos = Array.from({ length: 4 }, (_, i) => makeDummyPhoto(i));
      const canvas = await renderStrip(templates[0], photos);
      const blob = await canvasToPngBlob(canvas);

      // 캔버스 속성이 아니라 실제 export된 PNG를 디코드해 픽셀 크기를 검증한다
      const bitmap = await createImageBitmap(blob);
      const { width, height } = bitmap;
      bitmap.close();
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return {
          previewUrl: URL.createObjectURL(blob),
          blob,
          width,
          height,
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  const sizeOk = result?.width === 1060 && result?.height === 3187;

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">M1 검증 — renderStrip()</h1>
      <p className="text-sm text-gray-500">
        더미 4장으로 합성한 PNG가 정확히 1060 × 3187 px인지 확인합니다.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {running ? "합성 중…" : "더미 4장으로 합성"}
      </button>

      {error && <p className="text-red-600">오류: {error}</p>}

      {result && (
        <>
          <p
            className={`text-lg font-mono font-semibold ${
              sizeOk ? "text-green-600" : "text-red-600"
            }`}
          >
            {sizeOk ? "✓" : "✗"} export 실제 크기: {result.width} ×{" "}
            {result.height} px {sizeOk ? "(규격 일치)" : "(규격 불일치!)"}
          </p>

          <button
            onClick={() => downloadBlob(result.blob, stripFilename())}
            className="rounded-lg border border-gray-400 px-6 py-3 font-semibold"
          >
            PNG 다운로드
          </button>

          {/* 미리보기는 CSS 축소일 뿐, export 원본은 항상 1060×3187 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.previewUrl}
            alt="스트립 미리보기"
            className="w-[265px] border border-gray-300 shadow-md"
          />
        </>
      )}
    </main>
  );
}
