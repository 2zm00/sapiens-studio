export interface CameraStartOptions {
  /** enumerateDevices로 얻은 특정 카메라 선택 (없으면 facingMode: user) */
  deviceId?: string;
}

/** getUserMedia로 전면 카메라 스트림을 요청한다. (CLAUDE.md: ideal 1920×1080) */
export async function startCamera(
  opts: CameraStartOptions = {},
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("getUserMedia 미지원", "NotSupportedError");
  }
  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };
  if (opts.deviceId) {
    // deviceId(exact)와 facingMode를 동시에 주면 충돌할 수 있어 deviceId 우선
    video.deviceId = { exact: opts.deviceId };
  } else {
    video.facingMode = "user";
  }
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** 라벨은 권한 허용 후에만 채워지므로, 권한 획득 뒤에 호출할 것 */
export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "videoinput");
}

/**
 * 비디오의 현재 프레임을 원본 해상도로 캡처한다.
 * mirror=true면 프리뷰(셀카 미러)와 동일하게 좌우 반전하여 저장 → 미리보기/저장 일관성.
 * 업스케일 없이 비디오 원본 픽셀 그대로 캡처(인위적 화질 위조 금지).
 */
export async function captureFrame(
  video: HTMLVideoElement,
  mirror = true,
): Promise<ImageBitmap> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    throw new Error("비디오 프레임이 아직 준비되지 않았습니다.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 생성할 수 없습니다.");
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return createImageBitmap(canvas);
}

export type CameraErrorKind =
  | "denied"
  | "notfound"
  | "inuse"
  | "unsupported"
  | "unknown";

export interface CameraErrorInfo {
  kind: CameraErrorKind;
  message: string;
}

const ERROR_MESSAGES: Record<CameraErrorKind, string> = {
  denied:
    "카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 권한을 허용한 뒤 다시 시도해 주세요.",
  notfound: "사용 가능한 카메라를 찾을 수 없습니다.",
  inuse:
    "다른 앱이나 탭이 카메라를 사용 중입니다. 해당 프로그램을 닫고 다시 시도해 주세요.",
  unsupported:
    "이 브라우저/환경에서는 카메라를 사용할 수 없습니다. HTTPS 연결이 필요합니다.",
  unknown: "카메라를 시작하는 중 알 수 없는 오류가 발생했습니다.",
};

export function classifyCameraError(err: unknown): CameraErrorInfo {
  let kind: CameraErrorKind = "unknown";
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    kind = "unsupported";
  } else if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        kind = "denied";
        break;
      case "NotFoundError":
      case "OverconstrainedError":
        kind = "notfound";
        break;
      case "NotReadableError":
      case "AbortError":
        kind = "inuse";
        break;
      case "NotSupportedError":
        kind = "unsupported";
        break;
    }
  }
  return { kind, message: ERROR_MESSAGES[kind] };
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
