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

// "자연 보정" 100%(슬라이더 최대) 기준 강도. 실제 적용 = 이 값 × intensity(0~1).
const BEAUTY = {
  jawPull: 0.1, // 하관 윤곽을 세로 중심선 쪽으로 당기는 최대 비율(V라인)
  eyeScale: 1.14, // 눈 확대 배율(100%일 때)
  skinBlurPx: 5, // 피부 스무딩 블러
  skinAlpha: 0.5, // 스무딩 블렌딩 강도(100%일 때)
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
  private intensity = 0.5; // 0~1 보정 강도(슬라이더)
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

  /** 보정 강도 0~1 (0이면 사실상 원본). */
  setIntensity(v: number) {
    this.intensity = Math.max(0, Math.min(1, v));
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
    if (!this.enabled || !this.landmarks || this.intensity <= 0) return;
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
    ctx.globalAlpha = BEAUTY.skinAlpha * this.intensity;
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
    const eyeScale = 1 + (BEAUTY.eyeScale - 1) * this.intensity;
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
      ectx.scale(eyeScale, eyeScale);
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
    const pull = BEAUTY.jawPull * this.intensity;
    if (pull <= 0) return;
    const O = ovalRing.map((i) => px(i));
    const n = O.length;
    // 얼굴 중심점/세로 범위
    let cxSum = 0;
    let cySum = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of O) {
      cxSum += p.x;
      cySum += p.y;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const C = { x: cxSum / n, y: cySum / n }; // 워핑 고정 중심
    const midY = (minY + maxY) / 2;
    const span = Math.max(1, maxY - midY);
    // 목적지 윤곽 O': 하관일수록 중심선 쪽으로 당김(상반부는 거의 그대로)
    const Od = O.map((p) => {
      const wgt = smoothstep((p.y - midY) / span);
      return { x: p.x + (C.x - p.x) * pull * wgt, y: p.y };
    });
    // 고정 외곽링 Q: 윤곽 바깥(목/볼/귀 쪽)으로 확장. 변위 0 → 바깥 인물과 이음새 없음.
    const Q_EXPAND = 0.6;
    const Q = O.map((p) => ({
      x: p.x + (p.x - C.x) * Q_EXPAND,
      y: p.y + (p.y - C.y) * Q_EXPAND,
    }));

    const snap = this.snapshot(target, w, h);

    // Q 내부를 비우고 다시 채운다: 안쪽 부채꼴(슬림) + 바깥 밴드(주변 살을 끌어당겨 빈틈 메움).
    // → 구멍이 생기지 않아 흰 선 없음. Q는 고정이라 Q 바깥(원본 인물)과 연속.
    ctx.save();
    ctx.beginPath();
    ringPath(ctx, Q);
    ctx.clip();
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // 안쪽 부채꼴: C,O[i],O[j] → C,Od[i],Od[j] (얼굴 내부 슬림)
      drawTri(
        ctx, snap,
        C.x, C.y, O[i].x, O[i].y, O[j].x, O[j].y,
        C.x, C.y, Od[i].x, Od[i].y, Od[j].x, Od[j].y,
        0.9,
      );
      // 바깥 밴드: O[i],O[j],Q[*] → Od[i],Od[j],Q[*] (목/볼을 끌어당겨 빈틈 채움)
      drawTri(
        ctx, snap,
        O[i].x, O[i].y, O[j].x, O[j].y, Q[i].x, Q[i].y,
        Od[i].x, Od[i].y, Od[j].x, Od[j].y, Q[i].x, Q[i].y,
        0.9,
      );
      drawTri(
        ctx, snap,
        O[j].x, O[j].y, Q[j].x, Q[j].y, Q[i].x, Q[i].y,
        Od[j].x, Od[j].y, Q[j].x, Q[j].y, Q[i].x, Q[i].y,
        0.9,
      );
    }
  }
}

function ringPath(ctx: CanvasRenderingContext2D, ring: Pt[]) {
  ctx.moveTo(ring[0].x, ring[0].y);
  for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
  ctx.closePath();
}

/**
 * 소스 삼각형 → 목적지 삼각형 affine 매핑으로 이미지를 그린다.
 * 클립은 (선택적으로) 부풀린 목적지 삼각형으로, 변환은 원본 매핑으로 → 인접 삼각형이
 * 살짝 겹쳐 그려져 삼각형 사이 AA 틈(흰 선)이 사라진다.
 */
function drawTri(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sx0: number, sy0: number, sx1: number, sy1: number, sx2: number, sy2: number,
  dx0: number, dy0: number, dx1: number, dy1: number, dx2: number, dy2: number,
  inflatePx = 0,
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
  // 클립용 목적지 삼각형(무게중심 기준으로 inflatePx만큼 바깥으로)
  let cx0 = dx0, cy0 = dy0, cx1 = dx1, cy1 = dy1, cx2 = dx2, cy2 = dy2;
  if (inflatePx > 0) {
    const gx = (dx0 + dx1 + dx2) / 3;
    const gy = (dy0 + dy1 + dy2) / 3;
    const push = (x: number, y: number): [number, number] => {
      const ux = x - gx;
      const uy = y - gy;
      const len = Math.hypot(ux, uy) || 1;
      return [x + (ux / len) * inflatePx, y + (uy / len) * inflatePx];
    };
    [cx0, cy0] = push(dx0, dy0);
    [cx1, cy1] = push(dx1, dy1);
    [cx2, cy2] = push(dx2, dy2);
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx1, cy1);
  ctx.lineTo(cx2, cy2);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
