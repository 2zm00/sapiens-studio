"use client";

import { useCallback, useState } from "react";
import CameraStage from "./CameraStage";
import ResultStage from "./ResultStage";
import TemplatePicker from "./TemplatePicker";
import { canvasToPngBlob, renderStrip } from "@/lib/compose";
import { templates } from "@/lib/templates";
import type { FrameTemplate } from "@/types";

type Phase = "selecting" | "capture" | "rendering" | "result";

export interface BoothFlowProps {
  /** 카운트다운 초 (검증용으로 단축 가능) */
  countdownSeconds?: number;
}

/**
 * 템플릿 선택 → 촬영 → 합성 → 결과 다운로드 플로우.
 */
export default function BoothFlow({ countdownSeconds = 3 }: BoothFlowProps) {
  const [template, setTemplate] = useState<FrameTemplate>(templates[0]);

  const [phase, setPhase] = useState<Phase>("selecting");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stripCanvas, setStripCanvas] = useState<HTMLCanvasElement | null>(null);
  const [photos, setPhotos] = useState<ImageBitmap[]>([]);
  const [capturedAt, setCapturedAt] = useState<Date>(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (captured: ImageBitmap[]) => {
      setPhase("rendering");
      setError(null);
      try {
        const now = new Date();
        const canvas = await renderStrip(template, captured, { date: now });
        const blob = await canvasToPngBlob(canvas);
        setCapturedAt(now);
        setStripCanvas(canvas);
        setPhotos(captured); // 개별 컷 다운로드용으로 원본 보존
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
    setPhotos((prev) => {
      prev.forEach((b) => b.close?.());
      return [];
    });
    setError(null);
    setPhase("selecting");
  }, []);

  if (phase === "selecting") {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <h2 className="font-serif text-2xl text-neutral-900 dark:text-neutral-50">
          템플릿을 골라주세요
        </h2>
        <TemplatePicker
          templates={templates}
          selectedId={template.id}
          onSelect={setTemplate}
        />
        <button
          onClick={() => {
            setError(null);
            setPhase("capture");
          }}
          className="liquid-glass rounded-full px-8 py-3 text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-white"
        >
          이 템플릿으로 촬영 시작
        </button>
      </div>
    );
  }

  if (phase === "result" && previewUrl && stripCanvas) {
    return (
      <ResultStage
        template={template}
        stripPreviewUrl={previewUrl}
        stripCanvas={stripCanvas}
        photos={photos}
        capturedAt={capturedAt}
        onRestart={restart}
      />
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
          cameraBackground={template.cameraBackground}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
