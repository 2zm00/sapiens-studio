export interface PhotoSlot {
  id: number; // 1~4
  x: number; // 1060×3187 좌표계 기준 px
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface TextOverlay {
  text: string; // {date} 토큰 지원 → 촬영일로 치환
  x: number;
  y: number;
  font: string; // 예: "bold 44px Pretendard, sans-serif"
  color: string;
  align?: CanvasTextAlign; // 기본 "center"
}

export interface FrameTemplate {
  id: string;
  name: string;
  thumbnail: string; // 선택 UI용 미리보기 이미지 경로
  background: { type: "color" | "image"; value: string }; // value = hex 또는 이미지 경로
  slots: PhotoSlot[]; // 길이 4 고정
  overlays?: TextOverlay[]; // 로고/날짜/문구 등
  foregroundImage?: string; // 사진 위에 덮는 투명 PNG 장식(선택)
  canvasWidth: 1060; // 고정
  canvasHeight: 3187; // 고정
}

/** 합성에 사용할 수 있는 촬영 컷 소스 */
export type PhotoSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

/** 부스 화면 상태 머신 */
export type BoothState =
  | "idle"
  | "selecting"
  | "capturing"
  | "reviewing"
  | "done";

export const STRIP_WIDTH = 1060 as const;
export const STRIP_HEIGHT = 3187 as const;
export const PRINT_WIDTH = 2120 as const; // 4×6 인쇄용 = 스트립 2장 좌우 배치
export const CUT_COUNT = 4 as const;
