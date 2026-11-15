import { Suspense } from "react";
import { ItemDetailClient } from "@/components/marketplace/ItemDetailClient";

async function ItemDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemDetailClient id={id} />;
}

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] text-sm text-[#65676B]">
          Loading listing...
        </div>
      }
    >
      <ItemDetailLoader params={params} />
    </Suspense>
  );
}
