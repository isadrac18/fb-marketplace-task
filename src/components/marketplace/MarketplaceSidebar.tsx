"use client";

import Link from "next/link";
import { CreditCard, Plus, Store } from "lucide-react";
import { MARKETPLACE_CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

interface MarketplaceSidebarProps {
  activeSlug?: string;
}

export function MarketplaceSidebar({ activeSlug }: MarketplaceSidebarProps) {
  const isHome = !activeSlug;

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-[#E4E6EB] bg-white md:block lg:w-[310px]">
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-y-auto px-3 py-4">
        {/* Top Browse & Create actions */}
        <div className="space-y-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors",
              isHome
                ? "bg-[#E7F3FF] text-[#1877F2]"
                : "text-[#050505] hover:bg-[#F0F2F5]"
            )}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full",
                isHome
                  ? "bg-[#1877F2] text-white"
                  : "bg-[#E4E6EB] text-[#050505]"
              )}
            >
              <Store className="size-4" />
            </span>
            <span className="font-semibold">Browse all</span>
          </Link>

          <Link
            href="/create"
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#E7F3FF] px-3 text-[15px] font-semibold text-[#1877F2] transition-colors hover:bg-[#DBE7F2]"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Create new listing</span>
          </Link>

          <Link
            href="/seller/connect"
            className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#635BFF]/30 bg-[#635BFF]/10 px-3 text-[14px] font-semibold text-[#635BFF] transition-colors hover:bg-[#635BFF]/15"
          >
            <CreditCard className="size-4" />
            <span>Connect with Stripe</span>
          </Link>
        </div>

        <div className="my-3 border-t border-[#E4E6EB]" />

        {/* Categories list matching mockup */}
        <div>
          <h2 className="mb-2 px-2.5 text-[17px] font-bold text-[#050505]">
            Categories
          </h2>
          <nav aria-label="Marketplace categories" className="space-y-0.5">
            {MARKETPLACE_CATEGORIES.map((category) => {
              const isActive = activeSlug === category.slug;
              return (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[15px] font-medium transition-colors",
                    isActive
                      ? "bg-[#E7F3FF] font-semibold text-[#1877F2]"
                      : "text-[#050505] hover:bg-[#F0F2F5]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                      isActive
                        ? "bg-[#1877F2] text-white"
                        : "bg-[#E4E6EB] text-[#050505]"
                    )}
                  >
                    <CategoryIcon name={category.iconName} className="size-4" />
                  </span>
                  <span className="truncate">{category.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function MobileCategoryStrip({ activeSlug }: MarketplaceSidebarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-[#E4E6EB] bg-white px-4 py-2.5 md:hidden">
      <Link
        href="/"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
          !activeSlug
            ? "bg-[#E7F3FF] text-[#1877F2]"
            : "bg-[#F0F2F5] text-[#050505] hover:bg-[#E4E6EB]"
        )}
      >
        All
      </Link>
      {MARKETPLACE_CATEGORIES.map((category) => {
        const isActive = activeSlug === category.slug;
        return (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-[#E7F3FF] text-[#1877F2]"
                : "bg-[#F0F2F5] text-[#050505] hover:bg-[#E4E6EB]"
            )}
          >
            <CategoryIcon name={category.iconName} className="size-3.5" />
            <span>{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
