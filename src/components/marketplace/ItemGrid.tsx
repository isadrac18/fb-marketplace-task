"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Plus, RefreshCw, SearchX } from "lucide-react";
import { Listing } from "@/lib/types";
import {
  getSupabaseClient,
  mapDbListingToListing,
  type DbListingRow,
} from "@/lib/supabase";
import { ListingCard } from "./ListingCard";

interface ItemGridProps {
  categorySlug?: string;
  categoryName?: string;
  searchQuery: string;
  onClearSearch: () => void;
  viewMode: "grid" | "list";
  onResultCountChange?: (count: number) => void;
}

export function ItemGrid({
  categorySlug,
  categoryName,
  searchQuery,
  onClearSearch,
  viewMode,
  onResultCountChange,
}: ItemGridProps) {
  const [items, setItems] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const fetchListings = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (categorySlug) params.set("category", categorySlug);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());

        const qs = params.toString();
        const url = qs ? `/api/listings?${qs}` : "/api/listings";
        const res = await fetch(url, { signal });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errData.error || "Failed to load marketplace items.");
        }

        const data = (await res.json()) as { listings?: Listing[] };
        const fetched = Array.isArray(data.listings) ? data.listings : [];
        setItems(fetched);
        onResultCountChange?.(fetched.length);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load listings. Please try again."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [categorySlug, searchQuery, onResultCountChange]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchListings(controller.signal);
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchListings, reloadToken]);

  // Subscribe to Supabase Realtime postgres_changes on listings when configured
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const matchesFilters = (item: Listing) => {
      if (categorySlug && item.category !== categorySlug) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    };

    const channel = supabase
      .channel(`listings-realtime-${categorySlug ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        (payload) => {
          const incoming = mapDbListingToListing(payload.new as DbListingRow);
          if (!matchesFilters(incoming)) return;
          setItems((prev) => {
            if (prev.some((existing) => existing.id === incoming.id)) {
              return prev;
            }
            const next = [incoming, ...prev];
            onResultCountChange?.(next.length);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings" },
        (payload) => {
          const updated = mapDbListingToListing(payload.new as DbListingRow);
          setItems((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "listings" },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (!deletedId) return;
          setItems((prev) => {
            const next = prev.filter((item) => item.id !== deletedId);
            onResultCountChange?.(next.length);
            return next;
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsRealtimeConnected(false);
      supabase.removeChannel(channel);
    };
  }, [categorySlug, searchQuery, onResultCountChange]);

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#65676B]">
          <Loader2 className="size-4 animate-spin text-[#1877F2]" />
          <span>Loading listings...</span>
        </div>
        <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="animate-pulse space-y-2 p-1.5">
              <div className="aspect-square w-full rounded-lg bg-[#E4E6EB]" />
              <div className="h-4 w-20 rounded bg-[#E4E6EB]" />
              <div className="h-3.5 w-full rounded bg-[#E4E6EB]" />
              <div className="h-3 w-24 rounded bg-[#E4E6EB]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-white px-6 py-14 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="size-6" />
        </span>
        <h2 className="mt-3 text-lg font-bold text-[#050505]">
          Could not load listings
        </h2>
        <p className="mt-1 max-w-md text-sm text-[#65676B]">{error}</p>
        <button
          type="button"
          onClick={() => setReloadToken((n) => n + 1)}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
        >
          <RefreshCw className="size-4" />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E4E6EB] bg-white px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[#F0F2F5] text-[#65676B]">
          <SearchX className="size-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-[#050505]">
          No listings found
        </h2>
        <p className="mt-1 max-w-md text-sm text-[#65676B]">
          {searchQuery.trim()
            ? "Try adjusting your search keywords or clearing your filter."
            : `There are no listings in ${categoryName ?? "this category"} yet.`}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={onClearSearch}
              className="inline-flex h-9 items-center rounded-lg bg-[#E4E6EB] px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#D8DADF]"
            >
              Clear search
            </button>
          )}
          <Link
            href={
              categorySlug
                ? `/create/item?category=${categorySlug}`
                : "/create/item"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
          >
            <Plus className="size-4" />
            <span>Create listing</span>
          </Link>
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {isRealtimeConnected && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span>Live updates active</span>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} viewMode="list" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isRealtimeConnected && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          <span>Live updates active</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing} viewMode="grid" />
        ))}
      </div>
    </div>
  );
}
