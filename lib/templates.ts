import { BRAND } from "@/lib/brand";
import type { FrameTemplate } from "@/types";

// 좌우 여백 45, 상단 45, 컷 간 간격 24, 사진 비율 4:3
// 사진폭 970, 사진높이 728, 하단 158px는 로고/날짜 영역
const classicWhite: FrameTemplate = {
  id: "classic-white",
  name: "Classic White",
  thumbnail: "/templates/classic-white.png",
  background: { type: "color", value: "#FFFFFF" },
  cameraBackground: { type: "color", value: "#F3F5F8" }, // 흰 프레임(#FFF)보다 살짝 톤 다운된 화이트 → 배경 제거 + 사진/프레임 분리감
  slots: [
    { id: 1, x: 45, y: 45, width: 970, height: 728 },
    { id: 2, x: 45, y: 797, width: 970, height: 728 },
    { id: 3, x: 45, y: 1549, width: 970, height: 728 },
    { id: 4, x: 45, y: 2301, width: 970, height: 728 },
  ],
  overlays: [
    {
      text: BRAND.name,
      x: 530,
      y: 3070,
      font: "bold 40px sans-serif",
      color: "#111",
      align: "center",
    },
    {
      text: "{date}",
      x: 530,
      y: 3130,
      font: "28px sans-serif",
      color: "#888",
      align: "center",
    },
  ],
  canvasWidth: 1060,
  canvasHeight: 3187,
};

// classic-white와 동일한 슬롯 지오메트리(검증됨)를 재사용하고 색/장식만 바꾼다.
const slots4 = (radius?: number): FrameTemplate["slots"] => [
  { id: 1, x: 45, y: 45, width: 970, height: 728, borderRadius: radius },
  { id: 2, x: 45, y: 797, width: 970, height: 728, borderRadius: radius },
  { id: 3, x: 45, y: 1549, width: 970, height: 728, borderRadius: radius },
  { id: 4, x: 45, y: 2301, width: 970, height: 728, borderRadius: radius },
];

const softPink: FrameTemplate = {
  id: "soft-pink",
  name: "Soft Pink",
  thumbnail: "/templates/soft-pink.png",
  background: { type: "color", value: "#FFE3EC" },
  cameraBackground: { type: "color", value: "#FFD9E8" }, // 파스텔 핑크 단색 배경
  slots: slots4(24),
  overlays: [
    {
      text: BRAND.name,
      x: 530,
      y: 3070,
      font: "bold 40px sans-serif",
      color: "#D6336C",
      align: "center",
    },
    {
      text: "{date}",
      x: 530,
      y: 3130,
      font: "28px sans-serif",
      color: "#C2628A",
      align: "center",
    },
  ],
  canvasWidth: 1060,
  canvasHeight: 3187,
};

const monoBlack: FrameTemplate = {
  id: "mono-black",
  name: "Mono Black",
  thumbnail: "/templates/mono-black.png",
  background: { type: "color", value: "#111111" },
  cameraBackground: { type: "color", value: "#2B2B30" }, // 프레임(#111)보다 살짝 밝은 차콜 → 사진/프레임 분리감
  slots: slots4(),
  overlays: [
    {
      text: BRAND.name,
      x: 530,
      y: 3070,
      font: "bold 40px sans-serif",
      color: "#FFFFFF",
      align: "center",
    },
    {
      text: "{date}",
      x: 530,
      y: 3130,
      font: "28px sans-serif",
      color: "#AAAAAA",
      align: "center",
    },
  ],
  canvasWidth: 1060,
  canvasHeight: 3187,
};

/** 테마 추가 = 이 배열에 FrameTemplate 객체 1개 추가 (코드 분기 금지) */
export const templates: FrameTemplate[] = [classicWhite, softPink, monoBlack];

export function getTemplate(id: string): FrameTemplate | undefined {
  return templates.find((t) => t.id === id);
}
