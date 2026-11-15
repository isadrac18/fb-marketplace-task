import Link from "next/link";
import { ArrowLeft, Car, Home, Tag } from "lucide-react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

const LISTING_TYPES = [
  {
    title: "Item for sale",
    description: "Create a single listing for one or more items to sell.",
    href: "/create/item",
    icon: Tag,
    iconBg: "bg-[#E7F3FF] text-[#1877F2]",
  },
  {
    title: "Vehicle for sale",
    description: "Sell a car, truck or other type of vehicle.",
    href: "/create/item?category=vehicles",
    icon: Car,
    iconBg: "bg-[#E8F5E9] text-[#2E7D32]",
  },
  {
    title: "Home for sale or rent",
    description: "List a house or apartment for sale or rent.",
    href: "/create/item?category=property-rentals",
    icon: Home,
    iconBg: "bg-[#FFF3E0] text-[#EF6C00]",
  },
];

export default function CreateListingTypePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#65676B] transition-colors hover:text-[#050505]"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#050505] sm:text-3xl">
            Choose listing type
          </h1>
          <p className="mt-1.5 text-[15px] text-[#65676B]">
            Select the type of listing you want to post on Marketplace.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LISTING_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Link
                key={type.title}
                href={type.href}
                className="group flex flex-col items-center rounded-xl border border-[#E4E6EB] bg-white p-6 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#1877F2]/40 hover:shadow-md"
              >
                <span
                  className={`flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${type.iconBg}`}
                >
                  <Icon className="size-7" />
                </span>
                <h2 className="mt-4 text-[17px] font-bold text-[#050505] group-hover:text-[#1877F2]">
                  {type.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#65676B]">
                  {type.description}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
