"use client";

export interface StripPreviewProps {
  /** 1060×3187 스트립 PNG의 blob URL (또는 dataURL) */
  src: string;
  /** 화면 표시 폭(px). 실제 export는 항상 1060×3187 원본, 여기서는 CSS 축소만. */
  widthPx?: number;
  className?: string;
}

/** 합성된 스트립을 CSS로만 축소해 보여주는 미리보기 (export 해상도와 무관) */
export default function StripPreview({
  src,
  widthPx = 280,
  className,
}: StripPreviewProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="인생네컷 스트립 미리보기"
      style={{ width: widthPx }}
      className={`border border-gray-300 shadow-md ${className ?? ""}`}
    />
  );
}
