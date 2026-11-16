import { Suspense } from "react";
import { SellerConnectClient } from "@/components/marketplace/SellerConnectClient";

export default function SellerConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] text-sm text-[#65676B]">
          Loading Stripe Connect...
        </div>
      }
    >
      <SellerConnectClient />
    </Suspense>
  );
}
