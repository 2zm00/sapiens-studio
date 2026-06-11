"use client";

import { useState } from "react";
import CameraStage from "@/components/CameraStage";

export default function BoothPage() {
  // M2: 촬영 완료 시 캡처 장수만 확인. (M3에서 renderStrip 연결 예정)
  const [count, setCount] = useState<number | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 p-6">
      <h1 className="text-2xl font-bold">인생네컷 촬영</h1>

      {count === null ? (
        <CameraStage onComplete={(photos) => setCount(photos.length)} />
      ) : (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-lg font-semibold text-green-600">
            촬영 완료! {count}컷이 메모리에 저장되었습니다.
          </p>
          <p className="text-sm text-gray-500">
            (M3에서 이 컷들을 템플릿에 합성합니다.)
          </p>
          <button
            onClick={() => setCount(null)}
            className="rounded-lg border border-gray-400 px-6 py-3 font-semibold"
          >
            다시 촬영
          </button>
        </div>
      )}
    </main>
  );
}
