import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F0F2F5] text-sm font-medium text-[#65676B]"
    >
      <Loader2 className="size-8 animate-spin text-[#1877F2]" />
      <span>Loading Marketplace...</span>
    </div>
  );
}
