import BoothFlow from "@/components/BoothFlow";
import { BRAND } from "@/lib/brand";

export default function BoothPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 p-6">
      <h1 className="font-serif text-2xl tracking-tight">{BRAND.name}</h1>
      <BoothFlow />
    </main>
  );
}
