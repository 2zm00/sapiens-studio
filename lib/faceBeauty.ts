import type {
  FaceLandmarker as FaceLandmarkerInstance,
  FaceLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

// @mediapipe/tasks-vision의 Connection 타입은 export되지 않아 구조적 타입으로 대체.
type Connection = { start: number; end: number };

// 세그멘터(lib/segmenter.ts)와 동일한 분리 구성: JS는 npm, wasm/모델은 CDN(버전 핀).
const TASKS_VISION_VERSION = "0.10.35";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const DETECT_INPUT_LONG_SIDE = 384; // 랜드마크 입력 다운스케일(긴 변)
const DETECT_INTERVAL_MS = 66; // 검출 ≈ 15fps (검출 사이 프레임은 마지막 랜드마크 재사용)

// "자연 보정" 단일 프리셋 강도 (단일 ON/OFF). 값이 클수록 효과 강함.
const BEAUTY = {
  jawPull: 0.1, // 하관 윤곽을 세로 중심선 쪽으로 당기는 최대 비율(V라인)
  eyeScale: 1.14, // 눈 확대 배율
  skinBlurPx: 6, // 피부 스무딩 블러
  skinAlpha: 0.45, // 스무딩 블렌딩 강도
} as const;

// MediaPipe 468 메쉬의 눈 모서리 인덱스(좌/우 각각 외측·내측·상·하)
const LEFT_EYE = [33, 133, 159, 145] as const;
const RIGHT_EYE = [263, 362, 386, 374] as const;

let landmarkerPromise: Promise<FaceLandmarkerInstance> | null = null;
let ovalRing: number[] = [];

/** Connection(start→end) 목록을 닫힌 링(정점 인덱스 순서)으로 정렬한다. */
function ringFromConnections(conns: Connection[]): number[] {
  if (!conns.length) return [];
  const next = new Map<number, number>();
  for (const c of conns) next.set(c.start, c.end);
  const start = conns[0].start;
  const ring: number[] = [start];
  let cur = start;
  for (let i = 0; i < conns.length; i++) {
    const n = next.get(cur);
    if (n === undefined || n === start) break;
    ring.push(n);
    cur = n;
  }
  return ring;
}

async function createLandmarker(
  delegate: "GPU" | "CPU",
): Promise<FaceLandmarkerInstance> {
  const { FilesetResolver, FaceLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  if (!ovalRing.length) {
    ovalRing = ringFromConnections(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
  }
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
}

/**
 * 얼굴 랜드마커를 1회만 로드해 재사용한다. (세그멘터와 동일하게 GPU 실패 시 CPU 폴백)
 * 둘 다 실패하면 캐시를 비워 재시도를 허용(상위에서 보정 비활성).
 */
export function loadFaceLandmarker(): Promise<FaceLandmarkerInstance> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        return await createLandmarker("GPU");
      } catch (gpuErr) {
        console.warn(
          "[faceBeauty] GPU delegate 실패 — CPU로 폴백합니다.",
          gpuErr,
        );
        return await createLandmarker("CPU");
      }
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 생성할 수 없습니다.");
  return ctx;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

interface Pt {
  x: number;
  y: number;
}

/**
 * 얼굴 랜드마크로 눈 확대·V라인·피부 스무딩을 순수 Canvas 2D로 적용한다.
 * - 검출은 원본 video(미러 미적용)에서, 적용은 호출자가 넘긴 레이어(보통 인물 레이어)에서.
 * - 인물 레이어(투명 배경)에 적용하면 V라인으로 깎인 영역이 투명→배경이 비쳐 고스트 엣지가 없다.
 */
export class FaceBeautifier {
  private enabled = true;
  private landmarks: NormalizedLandmark[] | null = null;
  private lastDetect = -Infinity;

  private readonly input: HTMLCanvasElement;
  private readonly inputCtx: CanvasRenderingContext2D;
  private readonly snap: HTMLCanvasElement;
  private readonly snapCtx: CanvasRenderingContext2D;
  private readonly eye: HTMLCanvasElement;
  private readonly eyeCtx: CanvasRenderingContext2D;

  constructor(
    private readonly landmarker: FaceLandmarkerInstance,
    private readonly video: HTMLVideoElement,
  ) {
    this.input = document.createElement("canvas");
    this.inputCtx = ctx2d(this.input);
    this.snap = document.createElement("canvas");
    this.snapCtx = ctx2d(this.snap);
    this.eye = document.createElement("canvas");
    this.eyeCtx = ctx2d(this.eye);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  get hasFace(): boolean {
    return !!this.landmarks;
  }

  /** 다운스케일 입력으로 랜드마크를 갱신한다(스로틀). */
  detect(nowMs: number) {
    if (!this.enabled) return;
    if (nowMs - this.lastDetect < DETECT_INTERVAL_MS) return;
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    if (!vw || !vh) return;
    this.lastDetect = nowMs;
    const scale = DETECT_INPUT_LONG_SIDE / Math.max(vw, vh);
    const iw = Math.max(1, Math.round(vw * scale));
    const ih = Math.max(1, Math.round(vh * scale));
    if (this.input.width !== iw || this.input.height !== ih) {
      this.input.width = iw;
      this.input.height = ih;
    }
    this.inputCtx.drawImage(this.video, 0, 0, iw, ih);
    const result = this.landmarker.detectForVideo(
      this.input,
      Math.round(nowMs),
    ) as FaceLandmarkerResult;
    this.landmarks = result.faceLandmarks?.[0] ?? null;
  }

  /**
   * 레이어에 보정을 적용한다.
   * @param allowSlim 인물 레이어(투명 배경)처럼 깎인 영역이 비쳐도 되는 경우만 V라인 워핑 허용.
   */
  apply(
    target: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    allowSlim: boolean,
  ) {
    if (!this.enabled || !this.landmarks) return;
    const lm = this.landmarks;
    const px = (i: number): Pt => ({ x: lm[i].x * w, y: lm[i].y * h });

    this.skinSmooth(ctx, target, w, h, px);
    this.eyeEnlarge(ctx, target, w, h, px);
    if (allowSlim) this.jawSlim(ctx, target, w, h, px);
  }

  private snapshot(target: HTMLCanvasElement, w: number, h: number) {
    if (this.snap.width !== w || this.snap.height !== h) {
      this.snap.width = w;
      this.snap.height = h;
    }
    this.snapCtx.clearRect(0, 0, w, h);
    this.snapCtx.drawImage(target, 0, 0);
    return this.snap;
  }

  /** 얼굴 영역(oval)만 저강도 블러 블렌딩으로 잡티/거칠음 완화. */
  private skinSmooth(
    ctx: CanvasRenderingContext2D,
    target: HTMLCanvasElement,
    w: number,
    h: number,
    px: (i: number) => Pt,
  ) {
    if (ovalRing.length < 3) return;
    ctx.save();
    ctx.beginPath();
    const p0 = px(ovalRing[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < ovalRing.length; i++) {
      const p = px(ovalRing[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = BEAUTY.skinAlpha;
    ctx.filter = `blur(${BEAUTY.skinBlurPx}px)`;
    ctx.drawImage(target, 0, 0, w, h); // 자기 자신의 블러본을 클립 안에 덮음
    ctx.restore();
  }

  /** 양쪽 눈 주변 원형 영역을 확대해 부드러운 알파로 다시 합성(bulge). */
  private eyeEnlarge(
    ctx: CanvasRenderingContext2D,
    target: HTMLCanvasElement,
    w: number,
    h: number,
    px: (i: number) => Pt,
  ) {
    const snap = this.snapshot(target, w, h);
    for (const eye of [LEFT_EYE, RIGHT_EYE]) {
      const pts = eye.map((i) => px(i));
      const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
      const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
      // 외측-내측 모서리 거리 기반 반경
      const eyeW = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const R = Math.max(8, eyeW * 1.1);
      const size = Math.ceil(R * 2);
      if (this.eye.width !== size || this.eye.height !== size) {
        this.eye.width = size;
        this.eye.height = size;
      }
      const ectx = this.eyeCtx;
      ectx.setTransform(1, 0, 0, 1, 0, 0);
      ectx.clearRect(0, 0, size, size);
      // 확대 크롭
      ectx.save();
      ectx.translate(size / 2, size / 2);
      ectx.scale(BEAUTY.eyeScale, BEAUTY.eyeScale);
      ectx.drawImage(snap, cx - R, cy - R, R * 2, R * 2, -R, -R, R * 2, R * 2);
      ectx.restore();
      // 원형 페더 마스크
      ectx.globalCompositeOperation = "destination-in";
      const g = ectx.createRadialGradient(
        size / 2,
        size / 2,
        R * 0.4,
        size / 2,
        size / 2,
        R * 0.95,
      );
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ectx.fillStyle = g;
      ectx.fillRect(0, 0, size, size);
      ectx.globalCompositeOperation = "source-over";
      ctx.drawImage(this.eye, cx - size / 2, cy - size / 2);
    }
  }

  /** 얼굴 윤곽 하관을 안쪽으로 당겨 V라인. 윤곽-내부링 밴드만 삼각형 affine 워핑. */
  private jawSlim(
    ctx: CanvasRenderingContext2D,
    target: HTMLCanvasElement,
    w: number,
    h: number,
    px: (i: number) => Pt,
  ) {
    if (ovalRing.length < 6) return;
    const O = ovalRing.map((i) => px(i));
    const n = O.length;
    // 얼굴 중심선/범위
    let cxSum = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of O) {
      cxSum += p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const centerX = cxSum / n;
    const midY = (minY + maxY) / 2;
    const span = Math.max(1, maxY - midY);
    // 내부 링: 윤곽을 무게중심 쪽으로 수축(소스/목적지 공통 고정점)
    const cyAll = (minY + maxY) / 2;
    const I = O.map((p) => ({
      x: p.x + (centerX - p.x) * 0.22,
      y: p.y + (cyAll - p.y) * 0.22,
    }));
    // 목적지 윤곽 O': 하관일수록 중심선 쪽으로 당김
    const Od = O.map((p) => {
      const wgt = smoothstep((p.y - midY) / span); // 얼굴 하반부만
      return { x: p.x + (centerX - p.x) * BEAUTY.jawPull * wgt, y: p.y };
    });

    const snap = this.snapshot(target, w, h);

    // O–I 밴드(고스트 크레센트 포함)를 비운다.
    ctx.save();
    ctx.beginPath();
    ringPath(ctx, O);
    ringPath(ctx, I);
    ctx.clip("evenodd");
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    // 밴드를 O'(슬림)–I(고정)로 재배치하며 삼각형 워핑.
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // 소스 사각형: O[i],O[j],I[j],I[i]  → 목적지: Od[i],Od[j],I[j],I[i]
      drawTri(
        ctx,
        snap,
        O[i].x, O[i].y, O[j].x, O[j].y, I[i].x, I[i].y,
        Od[i].x, Od[i].y, Od[j].x, Od[j].y, I[i].x, I[i].y,
      );
      drawTri(
        ctx,
        snap,
        O[j].x, O[j].y, I[j].x, I[j].y, I[i].x, I[i].y,
        Od[j].x, Od[j].y, I[j].x, I[j].y, I[i].x, I[i].y,
      );
    }
  }
}

function ringPath(ctx: CanvasRenderingContext2D, ring: Pt[]) {
  ctx.moveTo(ring[0].x, ring[0].y);
  for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
  ctx.closePath();
}

/** 소스 삼각형 → 목적지 삼각형 affine 매핑으로 이미지를 그린다(목적지 삼각형 클립). */
function drawTri(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number,
  dx0: number, dy0: number, dx1: number, dy1: number, dx2: number, dy2: number,
) {
  const denom = sx0 * (sy2 - sy1) + sx1 * (sy0 - sy2) + sx2 * (sy1 - sy0);
  if (denom === 0) return;
  const a = (dx0 * (sy2 - sy1) + dx1 * (sy0 - sy2) + dx2 * (sy1 - sy0)) / denom;
  const b = (dy0 * (sy2 - sy1) + dy1 * (sy0 - sy2) + dy2 * (sy1 - sy0)) / denom;
  const c = (dx0 * (sx1 - sx2) + dx1 * (sx2 - sx0) + dx2 * (sx0 - sx1)) / denom;
  const d = (dy0 * (sx1 - sx2) + dy1 * (sx2 - sx0) + dy2 * (sx0 - sx1)) / denom;
  const e =
    (dx0 * (sx2 * sy1 - sx1 * sy2) +
      dx1 * (sx0 * sy2 - sx2 * sy0) +
      dx2 * (sx1 * sy0 - sx0 * sy1)) /
    denom;
  const f =
    (dy0 * (sx2 * sy1 - sx1 * sy2) +
      dy1 * (sx0 * sy2 - sx2 * sy0) +
      dy2 * (sx1 * sy0 - sx0 * sy1)) /
    denom;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
