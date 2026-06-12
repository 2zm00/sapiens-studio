import BoothFlow from "@/components/BoothFlow";

/** M2~M3 검증 전용 — 카운트다운 1초로 단축한 촬영→합성→다운로드 플로우 */
export default function ResultTestPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-bold">M3 검증 — 촬영→합성→다운로드</h1>
      <BoothFlow countdownSeconds={1} />
    </main>
  );
}
