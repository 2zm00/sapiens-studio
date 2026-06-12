"use client";

import { useCallback, useState } from "react";
import CameraStage from "./CameraStage";
import ResultActions from "./ResultActions";
import StripPreview from "./StripPreview";
import { canvasToPngBlob, renderStrip } from "@/lib/compose";
import { templates } from "@/lib/templates";
import type { FrameTemplate } from "@/types";

type Phase = "capture" | "rendering" | "result";

export interface BoothFlowProps {
  /** 카운트다운 초 (검증용으로 단축 가능) */
  countdownSeconds?: number;
}

/**
 * 촬영 → 합성 → 결과 다운로드 플로우.
 * M3: 템플릿은 classic-white 고정. M4에서 선택 UI로 교체한다.
 */
export default function BoothFlow({ countdownSeconds = 3 }: BoothFlowProps) {
  const template: FrameTemplate = templates[0]; // M4: TemplatePicker로 교체 예정

  const [phase, setPhase] = useState<Phase>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stripCanvas, setStripCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date>(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (photos: ImageBitmap[]) => {
      setPhase("rendering");
      setError(null);
      try {
        const now = new Date();
        const canvas = await renderStrip(template, photos, { date: now });
        const blob = await canvasToPngBlob(canvas);
        setCapturedAt(now);
        setStripCanvas(canvas);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setPhase("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("capture");
      }
    },
    [template],
  );

  const restart = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStripCanvas(null);
    setPhase("capture");
  }, []);

  if (phase === "result" && previewUrl && stripCanvas) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <h2 className="text-xl font-bold">완성!</h2>
        <p className="text-sm text-gray-500">템플릿: {template.name}</p>
        <StripPreview src={previewUrl} widthPx={300} />
        <ResultActions stripCanvas={stripCanvas} capturedAt={capturedAt} />
        <button
          onClick={restart}
          className="rounded-lg border border-gray-400 px-6 py-3 font-semibold"
        >
          다시 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {error && (
        <p className="text-sm text-red-600">합성 오류: {error}</p>
      )}
      {phase === "rendering" ? (
        <p className="py-12 text-gray-500">스트립 합성 중…</p>
      ) : (
        <CameraStage
          countdownSeconds={countdownSeconds}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
