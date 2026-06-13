<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 프로젝트: Sapiens Studio (세로 4컷 포토부스 웹앱)
# ※ "Sapiens Studio"는 브랜드명. "세로 4컷 스트립"은 제품 컨셉/카테고리 — 컨셉은 바꾸지 말 것.

## 절대 규칙 (어떤 경우에도 변경 금지)
- 단일 스트립 export 캔버스는 **정확히 1060 × 3187 px**. 임의로 바꾸지 말 것.
- 인쇄용 4×6 export는 **2120 × 3187 px** = 동일 스트립 2장 좌우 배치.
- 컷은 **4컷, 세로 1열**.
- export 캔버스에 devicePixelRatio 스케일을 적용하지 말 것(절대 픽셀 고정).
- 합성/출력은 **Canvas 2D API**로만. html-to-image 등 DOM 캡처 라이브러리 금지.
- 100% 클라이언트 사이드. 서버/DB/결제 코드 작성 금지.

## 템플릿 규칙
- 테마는 코드 if/switch 분기가 아니라 **FrameTemplate 데이터 객체**로만 정의.
- 새 테마 = lib/templates.ts에 객체 1개 추가만으로 동작해야 함.

## 카메라 규칙
- getUserMedia에 width:{ideal:1920}, height:{ideal:1080} 요청.
- 웹캠 원본보다 큰 해상도로 인위적 업스케일 금지. cover 크롭으로 슬롯 채움.
- iOS Safari 대응: video에 playsinline, 사용자 제스처 후 시작.

## 작업 방식
- 한 번에 한 마일스톤만. 끝나면 변경 파일과 검증 방법을 요약하고 멈출 것.
- 추측하지 말고, 규격에 모호함이 있으면 질문할 것.
- 각 단계 후 `npm run build`가 통과하는지 확인.
