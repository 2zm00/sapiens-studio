"use client";

import { useState } from "react";
import CameraStage from "@/components/CameraStage";

/** M2 검증 전용 — 카운트다운 1초로 단축한 빠른 촬영 플로우 */
export default function CameraTestPage() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold">M2 검증 — CameraStage</h1>
      {result === null ? (
        <CameraStage
          countdownSeconds={1}
          onComplete={(photos) =>
            setResult(
              photos
                .map((p, i) => `컷${i + 1}: ${p.width}×${p.height}`)
                .join(" / "),
            )
          }
        />
      ) : (
        <p data-testid="capture-result" className="font-mono text-green-600">
          완료: {result}
        </p>
      )}
    </main>
  );
}
