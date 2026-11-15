import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Listing } from "@/lib/types";
import { getCategoryBySlug } from "@/lib/categories";

export function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

interface ListingCardProps {
  listing: Listing;
  viewMode?: "grid" | "list";
}

export function ListingCard({ listing, viewMode = "grid" }: ListingCardProps) {
  const category = getCategoryBySlug(listing.category);

  if (viewMode === "list") {
    return (
      <Link
        href={`/item/${listing.id}`}
        className="group flex flex-col gap-3 rounded-xl border border-[#E4E6EB] bg-white p-3 transition-all hover:border-[#CED0D4] hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-[#F0F2F5] sm:size-32">
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, 128px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-[#050505]">
                {formatPrice(listing.price)}
              </span>
              {category && (
                <span className="rounded-full bg-[#F0F2F5] px-2.5 py-0.5 text-xs font-medium text-[#65676B]">
                  {category.name}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 line-clamp-1 text-[16px] font-semibold text-[#050505] group-hover:text-[#1877F2]">
              {listing.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-[#65676B]">
              {listing.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#65676B]">
            <MapPin className="size-3.5 shrink-0" />
            <span>{listing.location}</span>
            <span>·</span>
            <span>{listing.condition}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/item/${listing.id}`}
      className="group flex flex-col rounded-xl p-1.5 transition-colors hover:bg-white hover:shadow-sm"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-[#E4E6EB]/70 bg-[#F0F2F5]">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/[0.03]" />
      </div>

      <div className="mt-2 px-0.5">
        <p className="text-[17px] font-bold leading-snug text-[#050505]">
          {formatPrice(listing.price)}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-normal leading-snug text-[#050505] group-hover:underline">
          {listing.title}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-[#65676B]">
          {listing.location}
        </p>
      </div>
    </Link>
  );
}
