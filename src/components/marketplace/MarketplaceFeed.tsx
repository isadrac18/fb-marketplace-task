"use client";

import { useState } from "react";
import { LayoutGrid, List, MapPin } from "lucide-react";
import { useListings } from "@/lib/listings-store";
import { getCategoryBySlug } from "@/lib/categories";
import { MarketplaceHeader } from "./MarketplaceHeader";
import {
  MarketplaceSidebar,
  MobileCategoryStrip,
} from "./MarketplaceSidebar";
import { ItemGrid } from "./ItemGrid";
import { ErrorBoundary } from "./ErrorBoundary";
import { cn } from "@/lib/utils";

interface MarketplaceFeedProps {
  categorySlug?: string;
}

export function MarketplaceFeed({ categorySlug }: MarketplaceFeedProps) {
  const { searchQuery, setSearchQuery } = useListings();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [resultCount, setResultCount] = useState<number | null>(null);

  const activeCategory = categorySlug
    ? getCategoryBySlug(categorySlug)
    : undefined;

  const heading = activeCategory ? activeCategory.name : "Today's picks";

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <div className="mx-auto flex w-full max-w-[1920px] flex-1">
        <MarketplaceSidebar activeSlug={categorySlug} />

        <main className="flex min-w-0 flex-1 flex-col">
          <MobileCategoryStrip activeSlug={categorySlug} />

          <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[20px] font-bold tracking-tight text-[#050505] sm:text-[22px]">
                  {heading}
                </h1>
                {searchQuery.trim() && resultCount !== null && (
                  <p className="mt-0.5 text-sm text-[#65676B]">
                    Showing {resultCount}{" "}
                    {resultCount === 1 ? "result" : "results"} for{" "}
                    <span className="font-semibold text-[#050505]">
                      &ldquo;{searchQuery.trim()}&rdquo;
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#1877F2]">
                  <MapPin className="size-4" />
                  <span>Palo Alto, CA · 40 mi</span>
                </span>

                {/* Grid / List Toggle */}
                <div
                  role="group"
                  aria-label="View mode"
                  className="inline-flex rounded-lg border border-[#E4E6EB] bg-white p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      viewMode === "grid"
                        ? "bg-[#E7F3FF] text-[#1877F2]"
                        : "text-[#65676B] hover:bg-[#F0F2F5]"
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      viewMode === "list"
                        ? "bg-[#E7F3FF] text-[#1877F2]"
                        : "text-[#65676B] hover:bg-[#F0F2F5]"
                    )}
                  >
                    <List className="size-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              </div>
            </div>

            <ErrorBoundary fallbackTitle="Unable to display marketplace listings">
              <ItemGrid
                categorySlug={categorySlug}
                categoryName={activeCategory?.name}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
                viewMode={viewMode}
                onResultCountChange={setResultCount}
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
