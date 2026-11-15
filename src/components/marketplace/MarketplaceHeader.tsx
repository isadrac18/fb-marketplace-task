"use client";

import Link from "next/link";
import { Plus, Search, Store, X } from "lucide-react";
import { useListings } from "@/lib/listings-store";

export function MarketplaceHeader() {
  const { searchQuery, setSearchQuery } = useListings();

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-[#E4E6EB] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-full max-w-[1920px] items-center justify-between gap-3">
        {/* Left: Facebook F Logo + Marketplace */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-xs">
            <span className="text-2xl font-bold leading-none tracking-tight">
              f
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[19px] font-bold tracking-tight text-[#050505]">
              Marketplace
            </span>
          </div>
        </Link>

        {/* Center: Search Marketplace */}
        <div className="relative flex max-w-md flex-1 items-center">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-[#65676B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Marketplace"
            aria-label="Search Marketplace"
            className="h-10 w-full rounded-full bg-[#F0F2F5] pl-10 pr-9 text-[15px] text-[#050505] placeholder:text-[#65676B] focus:bg-[#E4E6EB]/70 focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 flex size-6 items-center justify-center rounded-full text-[#65676B] hover:bg-[#E4E6EB]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#F0F2F5] sm:inline-flex"
          >
            <Store className="size-4 text-[#1877F2]" />
            <span>Browse all</span>
          </Link>
          <Link
            href="/create"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E7F3FF] px-3.5 text-sm font-semibold text-[#1877F2] transition-colors hover:bg-[#DBE7F2]"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Create new listing</span>
            <span className="sm:hidden">Sell</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
