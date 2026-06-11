import type {
  FrameTemplate,
  PhotoSlot,
  PhotoSource,
  TextOverlay,
} from "@/types";

/** 이미지 경로를 로드하고 디코드 완료까지 대기 (미완료 상태로 그리면 빈 슬롯으로 export됨) */
async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function sourceSize(photo: PhotoSource): { width: number; height: number } {
  if (photo instanceof HTMLImageElement) {
    return { width: photo.naturalWidth, height: photo.naturalHeight };
  }
  return { width: photo.width, height: photo.height };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

/** 슬롯 비율과 사진 비율이 달라도 왜곡 없이 중앙 기준 크롭(cover)으로 채운다 */
function drawPhotoCover(
  ctx: CanvasRenderingContext2D,
  photo: PhotoSource,
  slot: PhotoSlot,
) {
  const { width: srcW, height: srcH } = sourceSize(photo);
  if (srcW === 0 || srcH === 0) {
    throw new Error(`슬롯 ${slot.id}: 사진 소스 크기가 0입니다.`);
  }

  const scale = Math.max(slot.width / srcW, slot.height / srcH);
  const cropW = slot.width / scale;
  const cropH = slot.height / scale;
  const sx = (srcW - cropW) / 2;
  const sy = (srcH - cropH) / 2;

  ctx.save();
  if (slot.borderRadius && slot.borderRadius > 0) {
    roundedRectPath(ctx, slot.x, slot.y, slot.width, slot.height, slot.borderRadius);
    ctx.clip();
  }
  ctx.drawImage(
    photo,
    sx,
    sy,
    cropW,
    cropH,
    slot.x,
    slot.y,
    slot.width,
    slot.height,
  );
  ctx.restore();
}

/** 촬영일 표기: YYYY.MM.DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  dateText: string,
) {
  ctx.font = overlay.font;
  ctx.fillStyle = overlay.color;
  ctx.textAlign = overlay.align ?? "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(overlay.text.replaceAll("{date}", dateText), overlay.x, overlay.y);
}

export interface RenderStripOptions {
  /** {date} 토큰 치환에 사용할 날짜 (기본: 현재 시각) */
  date?: Date;
}

/**
 * 4컷 사진을 템플릿에 합성해 1060×3187 캔버스를 반환한다.
 * 그리기 순서: background → 슬롯 사진(cover 크롭) → foregroundImage → overlays.
 * export 규격 고정이므로 devicePixelRatio 스케일을 절대 적용하지 않는다.
 */
export async function renderStrip(
  template: FrameTemplate,
  photos: PhotoSource[],
  options: RenderStripOptions = {},
): Promise<HTMLCanvasElement> {
  if (photos.length !== template.slots.length) {
    throw new Error(
      `사진 ${photos.length}장 / 슬롯 ${template.slots.length}개 — 개수가 일치해야 합니다.`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = template.canvasWidth; // 1060 절대 픽셀
  canvas.height = template.canvasHeight; // 3187 절대 픽셀
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 생성할 수 없습니다.");

  if (template.background.type === "color") {
    ctx.fillStyle = template.background.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const bg = await loadImage(template.background.value);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  }

  template.slots.forEach((slot, i) => drawPhotoCover(ctx, photos[i], slot));

  if (template.foregroundImage) {
    const fg = await loadImage(template.foregroundImage);
    ctx.drawImage(fg, 0, 0, canvas.width, canvas.height);
  }

  const dateText = formatDate(options.date ?? new Date());
  for (const overlay of template.overlays ?? []) {
    drawOverlay(ctx, overlay, dateText);
  }

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 변환에 실패했습니다."));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function stripFilename(now: Date = new Date()): string {
  return `lifefourcuts_${now.getTime()}.png`;
}
