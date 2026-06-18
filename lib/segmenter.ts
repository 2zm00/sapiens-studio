import type {
  ImageSegmenter,
  ImageSegmenterResult,
} from "@mediapipe/tasks-vision";
import type { CameraBackground } from "@/types";
import type { FaceBeautifier } from "@/lib/faceBeauty";

// JS는 npm 번들에서, wasm/모델은 CDN(버전 핀)에서 받는 표준 분리 구성.
// 설치된 @mediapipe/tasks-vision 버전과 wasm 버전을 반드시 일치시킨다.
const TASKS_VISION_VERSION = "0.10.35";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

const SEG_INPUT_LONG_SIDE = 256; // 세그멘테이션 입력 다운스케일(긴 변) — 모델 내부 해상도와 동급, 추론 가속
const SEG_INTERVAL_MS = 40; // 분리 주기 ≈ 25fps (프레임 스킵 허용)
const EDGE_FEATHER_PX = 3; // 마스크 경계 페더링(자글거림 완화)

let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function createSegmenter(
  delegate: "GPU" | "CPU",
): Promise<ImageSegmenter> {
  const { FilesetResolver, ImageSegmenter } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    outputConfidenceMasks: true, // 셀피 모델: confidenceMasks[0] = 사람(전경) 확률
    outputCategoryMask: false,
  });
}

/**
 * 셀피 세그멘터를 1회만 로드해 재사용한다.
 * 모바일 등 WebGL GPU delegate 미지원 환경을 위해 GPU 실패 시 CPU delegate로 폴백한다.
 * 둘 다 실패하면 캐시를 비워 재시도를 허용(상위에서 원본 카메라로 폴백).
 */
export function loadSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      try {
        return await createSegmenter("GPU");
      } catch (gpuErr) {
        console.warn(
          "[segmenter] GPU delegate 실패 — CPU로 폴백합니다.",
          gpuErr,
        );
        return await createSegmenter("CPU");
      }
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 생성할 수 없습니다.");
  return ctx;
}

/**
 * 비디오 프레임에서 인물을 분리해 템플릿 배경 위에 실시간 합성한다.
 * - 출력 캔버스(out)는 비디오 원본 해상도 → 셔터 캡처도 원본 화질(업스케일 없음).
 * - 분리는 다운스케일 입력으로 ~25fps, 합성은 매 rAF 프레임(부드러운 프리뷰).
 * - 좌표계는 미러를 적용하지 않은 원본. 미러는 프리뷰 CSS와 capture()에서만 처리.
 */
export class BackgroundReplacer {
  private bg: CameraBackground;
  private bgImage: HTMLImageElement | null = null;
  private beautifier: FaceBeautifier | null = null;

  private readonly outCtx: CanvasRenderingContext2D;
  private readonly input: HTMLCanvasElement;
  private readonly inputCtx: CanvasRenderingContext2D;
  private readonly mask: HTMLCanvasElement;
  private readonly maskCtx: CanvasRenderingContext2D;
  private maskData: ImageData | null = null;
  private readonly person: HTMLCanvasElement;
  private readonly personCtx: CanvasRenderingContext2D;

  private raf = 0;
  private running = false;
  private lastSeg = -Infinity;
  private hasMask = false;
  private ready = false; // 첫 합성 완료 여부

  constructor(
    private readonly segmenter: ImageSegmenter,
    private readonly video: HTMLVideoElement,
    private readonly out: HTMLCanvasElement,
    bg: CameraBackground,
  ) {
    this.outCtx = ctx2d(out);
    this.input = document.createElement("canvas");
    this.inputCtx = ctx2d(this.input);
    this.mask = document.createElement("canvas");
    this.maskCtx = ctx2d(this.mask);
    this.person = document.createElement("canvas");
    this.personCtx = ctx2d(this.person);
    this.bg = bg;
    this.setBackground(bg);
  }

  /** 얼굴 보정기를 주입/해제한다(M13). null이면 보정 미적용. */
  setBeautifier(beautifier: FaceBeautifier | null) {
    this.beautifier = beautifier;
  }

  setBackground(bg: CameraBackground) {
    this.bg = bg;
    this.bgImage = null;
    if (bg.type === "image" && bg.value) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.bgImage = img;
      };
      img.src = bg.value;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
      // 배경이 none(보정 단독 모드)이면 세그멘테이션 자체를 생략(불필요한 추론 회피)
      if (this.bg.type !== "none" && now - this.lastSeg >= SEG_INTERVAL_MS) {
        this.lastSeg = now;
        try {
          this.segment(now);
        } catch {
          // 분리 실패 프레임은 건너뛴다(다음 프레임 재시도)
        }
      }
      try {
        this.beautifier?.detect(now); // 내부 스로틀(검출 ≈15fps)
      } catch {
        // 검출 실패 프레임 무시
      }
      try {
        this.composite();
      } catch {
        // 합성 실패 프레임 무시
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** 다운스케일 입력으로 분리해 마스크 캔버스(알파)를 갱신한다. */
  private segment(nowMs: number) {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const scale = SEG_INPUT_LONG_SIDE / Math.max(vw, vh);
    const iw = Math.max(1, Math.round(vw * scale));
    const ih = Math.max(1, Math.round(vh * scale));
    if (this.input.width !== iw || this.input.height !== ih) {
      this.input.width = iw;
      this.input.height = ih;
    }
    this.inputCtx.drawImage(this.video, 0, 0, iw, ih);

    const result = this.segmenter.segmentForVideo(
      this.input,
      nowMs,
    ) as ImageSegmenterResult;
    try {
      const mask = result.confidenceMasks?.[0];
      if (!mask) return;
      const mw = mask.width;
      const mh = mask.height;
      const values = mask.getAsFloat32Array(); // 0..1 사람 확률
      if (this.mask.width !== mw || this.mask.height !== mh || !this.maskData) {
        this.mask.width = mw;
        this.mask.height = mh;
        this.maskData = this.maskCtx.createImageData(mw, mh);
      }
      const px = this.maskData.data;
      for (let i = 0; i < values.length; i++) {
        const j = i * 4;
        px[j] = 255;
        px[j + 1] = 255;
        px[j + 2] = 255;
        px[j + 3] = Math.round(values[i] * 255); // 알파 = 사람 확률
      }
      this.maskCtx.putImageData(this.maskData, 0, 0);
      this.hasMask = true;
    } finally {
      result.close(); // 마스크 리소스 해제 필수
    }
  }

  private syncSize(vw: number, vh: number) {
    if (this.out.width !== vw || this.out.height !== vh) {
      this.out.width = vw;
      this.out.height = vh;
    }
    if (this.person.width !== vw || this.person.height !== vh) {
      this.person.width = vw;
      this.person.height = vh;
    }
  }

  private drawCover(
    ctx: CanvasRenderingContext2D,
    src: CanvasImageSource,
    srcW: number,
    srcH: number,
    w: number,
    h: number,
    zoom = 1,
  ) {
    const scale = Math.max(w / srcW, h / srcH) * zoom;
    const dw = srcW * scale;
    const dh = srcH * scale;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  private composite() {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    this.syncSize(vw, vh);
    const ctx = this.outCtx;

    // 마스크/배경이 아직 없으면 원본 그대로 (어색한 중간 상태 방지)
    if (!this.hasMask || this.bg.type === "none") {
      ctx.filter = "none";
      ctx.drawImage(this.video, 0, 0, vw, vh);
      // 인물 레이어가 없는 경로 → 깎인 영역이 비칠 배경이 없으므로 V라인은 생략
      this.applyBeauty(this.out, ctx, vw, vh, false);
      this.ready = true;
      return;
    }

    // 1) 배경
    ctx.save();
    ctx.filter = "none";
    if (this.bg.type === "blur") {
      ctx.filter = `blur(${this.bg.blurAmount ?? 12}px)`;
      this.drawCover(ctx, this.video, vw, vh, vw, vh, 1.08); // 블러 가장자리 비침 방지
    } else if (this.bg.type === "image" && this.bgImage) {
      this.drawCover(
        ctx,
        this.bgImage,
        this.bgImage.naturalWidth,
        this.bgImage.naturalHeight,
        vw,
        vh,
      );
    } else if (this.bg.type === "color") {
      ctx.fillStyle = this.bg.value ?? "#000000";
      ctx.fillRect(0, 0, vw, vh);
    } else {
      // 이미지 미로드 등 → 원본 폴백
      ctx.drawImage(this.video, 0, 0, vw, vh);
      ctx.restore();
      this.applyBeauty(this.out, ctx, vw, vh, false);
      this.ready = true;
      return;
    }
    ctx.restore();

    // 2) 인물 레이어: 비디오를 마스크 알파로 클리핑(destination-in) 후 배경 위에 합성
    const pctx = this.personCtx;
    pctx.save();
    pctx.globalCompositeOperation = "source-over";
    pctx.filter = "none";
    pctx.clearRect(0, 0, vw, vh);
    pctx.drawImage(this.video, 0, 0, vw, vh);
    pctx.globalCompositeOperation = "destination-in";
    pctx.filter = `blur(${EDGE_FEATHER_PX}px)`;
    pctx.drawImage(this.mask, 0, 0, this.mask.width, this.mask.height, 0, 0, vw, vh);
    pctx.restore();

    // 인물 레이어(투명 배경)에 보정 적용 → V라인으로 깎인 영역은 투명→배경이 비쳐 고스트 없음
    this.applyBeauty(this.person, pctx, vw, vh, true);

    ctx.drawImage(this.person, 0, 0);
    this.ready = true;
  }

  private applyBeauty(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    allowSlim: boolean,
  ) {
    if (!this.beautifier) return;
    try {
      this.beautifier.apply(canvas, ctx, vw, vh, allowSlim);
    } catch {
      // 보정 실패 프레임 무시(원본 유지)
    }
  }

  /** 현재 합성된 프레임을 컷으로 캡처한다(mirror=true면 픽셀 공간에서 좌우 반전). */
  capture(mirror: boolean): Promise<ImageBitmap> {
    // 아직 합성 전이면 원본 비디오로 폴백
    const useOut = this.ready && this.out.width > 0;
    const source: CanvasImageSource = useOut ? this.out : this.video;
    const w = useOut ? this.out.width : this.video.videoWidth;
    const h = useOut ? this.out.height : this.video.videoHeight;
    if (!w || !h) throw new Error("프리뷰 프레임이 아직 준비되지 않았습니다.");
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const cx = ctx2d(canvas);
    if (mirror) {
      cx.translate(w, 0);
      cx.scale(-1, 1);
    }
    cx.drawImage(source, 0, 0, w, h);
    return createImageBitmap(canvas);
  }
}
