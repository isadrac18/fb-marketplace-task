"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Marketplace route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0F2F5] px-4 text-center">
      <div className="w-full max-w-md rounded-xl border border-[#E4E6EB] bg-white p-8 shadow-xs">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-[#050505]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[#65676B]">
          We encountered an unexpected error while loading this page. Please try
          again or return to Marketplace.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
          >
            <RefreshCw className="size-4" />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#E4E6EB] px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#D8DADF]"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
