import BoothFlow from "@/components/BoothFlow";

export default function BoothPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 p-6">
      <h1 className="text-2xl font-bold">인생네컷 촬영</h1>
      <BoothFlow />
    </main>
  );
}
