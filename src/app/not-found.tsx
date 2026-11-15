import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#E7F3FF] text-[#1877F2]">
          <Store className="size-8" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-[#050505]">
          This page isn&apos;t available
        </h1>
        <p className="mt-2 text-sm text-[#65676B]">
          The link you followed may be broken, or the listing or category may
          have been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1877F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Marketplace</span>
        </Link>
      </main>
    </div>
  );
}
