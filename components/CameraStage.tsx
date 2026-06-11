"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureFrame,
  classifyCameraError,
  listVideoInputs,
  startCamera,
  stopStream,
  wait,
  type CameraErrorInfo,
} from "@/lib/camera";

type Phase = "idle" | "requesting" | "ready" | "capturing" | "review" | "error";

export interface CameraStageProps {
  cutCount?: number;
  countdownSeconds?: number;
  /** 프리뷰/저장 모두 미러로 통일 (기본 true) */
  mirror?: boolean;
  onComplete: (photos: ImageBitmap[]) => void;
  onCancel?: () => void;
}

/** ImageBitmap을 4:3 박스에 cover 크롭으로 그려주는 썸네일 */
function BitmapThumb({
  bitmap,
  className,
}: {
  bitmap: ImageBitmap;
  className?: string;
}) {
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
    const sx = (bitmap.width - cw) / 2;
    const sy = (bitmap.height - ch) / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bitmap, sx, sy, cw, ch, 0, 0, W, H);
  }, [bitmap]);
  return <canvas ref={ref} width={240} height={180} className={className} />;
}

export default function CameraStage({
  cutCount = 4,
  countdownSeconds = 3,
  mirror = true,
  onComplete,
  onCancel,
}: CameraStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<CameraErrorInfo | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const [captured, setCaptured] = useState<(ImageBitmap | null)[]>(
    () => Array.from({ length: cutCount }, () => null),
  );
  const [currentCut, setCurrentCut] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [flash, setFlash] = useState(false);

  const attachStream = useCallback(async (stream: MediaStream) => {
    stopStream(streamRef.current);
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // 메타데이터 로드 후 재생 (iOS Safari: playsinline + muted 필요)
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.onloadedmetadata = () => resolve();
    });
    try {
      await video.play();
    } catch {
      // 자동재생 차단 시 무시 — 사용자 제스처로 이미 진입
    }
  }, []);

  const begin = useCallback(
    async (selectedId?: string) => {
      setPhase("requesting");
      setError(null);
      try {
        const stream = await startCamera({ deviceId: selectedId });
        await attachStream(stream);
        const inputs = await listVideoInputs();
        setDevices(inputs);
        const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        setDeviceId(selectedId ?? activeId);
        setPhase("ready");
      } catch (err) {
        setError(classifyCameraError(err));
        setPhase("error");
      }
    },
    [attachStream],
  );

  const switchDevice = useCallback(
    async (id: string) => {
      setDeviceId(id);
      await begin(id);
    },
    [begin],
  );

  /** 지정한 컷 인덱스들을 순차로 카운트다운 → 캡처 → 플래시 */
  const captureCuts = useCallback(
    async (indices: number[]) => {
      const video = videoRef.current;
      if (!video) return;
      setPhase("capturing");
      for (let i = 0; i < indices.length; i++) {
        const cut = indices[i];
        setCurrentCut(cut);
        for (let n = countdownSeconds; n >= 1; n--) {
          setCountdown(n);
          await wait(1000);
        }
        setCountdown(0);
        const frame = await captureFrame(video, mirror);
        setCaptured((prev) => {
          const next = [...prev];
          next[cut]?.close?.();
          next[cut] = frame;
          return next;
        });
        // 셔터 후 0.3초 플래시/프리즈
        setFlash(true);
        await wait(300);
        setFlash(false);
        if (i < indices.length - 1) await wait(500);
      }
      setPhase("review");
    },
    [countdownSeconds, mirror],
  );

  const startCapture = useCallback(() => {
    setCaptured((prev) => {
      prev.forEach((b) => b?.close?.());
      return Array.from({ length: cutCount }, () => null);
    });
    captureCuts(Array.from({ length: cutCount }, (_, i) => i));
  }, [captureCuts, cutCount]);

  const retakeCut = useCallback(
    (index: number) => captureCuts([index]),
    [captureCuts],
  );

  const finish = useCallback(() => {
    const photos = captured.filter((b): b is ImageBitmap => b !== null);
    if (photos.length !== cutCount) return;
    onComplete(photos);
  }, [captured, cutCount, onComplete]);

  // 언마운트 시 스트림 정리
  useEffect(() => {
    return () => stopStream(streamRef.current);
  }, []);

  const allCaptured = captured.every((b) => b !== null);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {/* idle: 사용자 제스처로 카메라 시작 (iOS 대응) */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-2xl font-bold">촬영 준비</h2>
          <p className="text-sm text-gray-500">
            카메라 권한을 허용하면 {cutCount}컷을 순차 촬영합니다.
          </p>
          <button
            onClick={() => begin(deviceId)}
            className="rounded-lg bg-black px-8 py-3 font-semibold text-white dark:bg-white dark:text-black"
          >
            카메라 켜기
          </button>
        </div>
      )}

      {phase === "requesting" && (
        <p className="py-12 text-gray-500">카메라 권한 요청 중…</p>
      )}

      {phase === "error" && error && (
        <div className="flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-xl font-bold text-red-600">카메라 오류</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {error.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => begin(deviceId)}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white dark:bg-white dark:text-black"
            >
              다시 시도
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-lg border border-gray-400 px-6 py-3 font-semibold"
              >
                취소
              </button>
            )}
          </div>
        </div>
      )}

      {/* 프리뷰 영역: ready / capturing / review 동안 비디오는 항상 마운트 유지 */}
      <div
        className={
          phase === "ready" || phase === "capturing" || phase === "review"
            ? "flex w-full max-w-4xl flex-col items-center gap-6 md:flex-row md:items-start"
            : "hidden"
        }
      >
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full object-cover"
            style={mirror ? { transform: "scaleX(-1)" } : undefined}
          />

          {/* 카운트다운 오버레이 */}
          {phase === "capturing" && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8rem] font-bold text-white drop-shadow-lg">
                {countdown}
              </span>
            </div>
          )}

          {/* 셔터 플래시 */}
          <div
            className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${
              flash ? "opacity-90" : "opacity-0"
            }`}
          />

          {/* 현재 컷 표시 */}
          {phase === "capturing" && (
            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
              {currentCut + 1} / {cutCount} 컷
            </div>
          )}
        </div>

        {/* 사이드: 카메라 선택 + 스트립 미리보기 + 컨트롤 */}
        <div className="flex w-full max-w-xs flex-col gap-4">
          {devices.length > 1 && phase !== "capturing" && (
            <select
              value={deviceId ?? ""}
              onChange={(e) => switchDevice(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `카메라 ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* 스트립 사이드 미리보기 (캡처되며 채워짐) */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-2 dark:border-gray-700">
            {captured.map((bmp, i) => (
              <div
                key={i}
                className={`relative aspect-[4/3] w-full overflow-hidden rounded-md ${
                  phase === "capturing" && currentCut === i
                    ? "ring-2 ring-blue-500"
                    : ""
                } ${bmp ? "" : "bg-gray-100 dark:bg-gray-800"}`}
              >
                {bmp ? (
                  <BitmapThumb
                    bitmap={bmp}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    {i + 1}
                  </div>
                )}
                {phase === "review" && bmp && (
                  <button
                    onClick={() => retakeCut(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-semibold text-transparent transition hover:bg-black/50 hover:text-white"
                  >
                    다시 찍기
                  </button>
                )}
              </div>
            ))}
          </div>

          {phase === "ready" && (
            <button
              onClick={startCapture}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white dark:bg-white dark:text-black"
            >
              촬영 시작
            </button>
          )}

          {phase === "review" && (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm text-gray-500">
                컷을 눌러 다시 찍을 수 있습니다.
              </p>
              <button
                onClick={finish}
                disabled={!allCaptured}
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                이대로 완료
              </button>
              <button
                onClick={startCapture}
                className="rounded-lg border border-gray-400 px-6 py-3 font-semibold"
              >
                전체 다시 찍기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
