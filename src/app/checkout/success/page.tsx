import { Suspense } from "react";
import { CheckoutSuccessClient } from "@/components/marketplace/CheckoutSuccessClient";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] text-sm text-[#65676B]">
          Loading order confirmation...
        </div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
