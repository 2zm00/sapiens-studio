"use client";

import { useEffect, useRef } from "react";
import type { FrameTemplate } from "@/types";

const THUMB_WIDTH = 96; // 표시 폭(px). 1060 좌표계를 이 폭으로 축소해 그린다.

/**
 * 템플릿 데이터(배경색·슬롯·둥근모서리·오버레이)를 축소 비율로 캔버스에 그려
 * 썸네일 PNG 에셋 없이도 미리보기를 만든다. 새 템플릿은 자동으로 그려진다.
 */
function TemplateThumb({ template }: { template: FrameTemplate }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const scale = THUMB_WIDTH / template.canvasWidth;
    canvas.width = Math.round(template.canvasWidth * scale);
    canvas.height = Math.round(template.canvasHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 배경: color는 채우고, image 타입은 로드 없이 중립 회색으로 근사
    if (template.background.type === "color") {
      ctx.fillStyle = template.background.value;
    } else {
      ctx.fillStyle = "#DDDDDD";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 슬롯 자리: 사진이 들어갈 영역을 옅은 회색 박스로 표시
    for (const slot of template.slots) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      const x = slot.x * scale;
      const y = slot.y * scale;
      const w = slot.width * scale;
      const h = slot.height * scale;
      const r = (slot.borderRadius ?? 0) * scale;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    }
  }, [template]);

  return (
    <canvas
      ref={ref}
      className="block rounded-sm"
      style={{ width: THUMB_WIDTH }}
      aria-hidden
    />
  );
}

export interface TemplatePickerProps {
  templates: FrameTemplate[];
  selectedId: string;
  onSelect: (template: FrameTemplate) => void;
}

export default function TemplatePicker({
  templates,
  selectedId,
  onSelect,
}: TemplatePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="프레임 템플릿 선택"
      className="flex flex-wrap justify-center gap-4"
    >
      {templates.map((template) => {
        const selected = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`template-${template.id}`}
            onClick={() => onSelect(template)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition ${
              selected
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-transparent hover:border-gray-300"
            }`}
          >
            <TemplateThumb template={template} />
            <span className="text-sm font-medium">{template.name}</span>
          </button>
        );
      })}
    </div>
  );
}
