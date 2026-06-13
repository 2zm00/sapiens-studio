import Link from "next/link";
import BoothFlow from "@/components/BoothFlow";
import { BRAND } from "@/lib/brand";

export default function BoothPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 p-6">
      <Link
        href="/"
        className="font-serif text-2xl tracking-tight transition-opacity hover:opacity-70"
      >
        {BRAND.name}
      </Link>
      <BoothFlow />
    </main>
  );
}
