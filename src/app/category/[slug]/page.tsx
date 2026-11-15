import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MarketplaceFeed } from "@/components/marketplace/MarketplaceFeed";
import {
  MARKETPLACE_CATEGORIES,
  getCategoryBySlug,
} from "@/lib/categories";

export function generateStaticParams() {
  return MARKETPLACE_CATEGORIES.filter((c) => c.slug !== "electronics").map(
    (category) => ({
      slug: category.slug,
    })
  );
}

async function CategoryLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return <MarketplaceFeed categorySlug={category.slug} />;
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] text-sm text-[#65676B]">
          Loading category...
        </div>
      }
    >
      <CategoryLoader params={params} />
    </Suspense>
  );
}
