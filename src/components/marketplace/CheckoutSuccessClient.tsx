"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { formatPrice } from "./ListingCard";

interface SessionResponse {
  session: {
    id: string;
    paymentStatus: string;
    amountTotal: number | null;
    currency: string | null;
    customerEmail: string | null;
    listingId: string | null;
  } | null;
  listing: {
    id: string;
    title: string;
    price: number;
    imageUrl: string;
    status: string;
  } | null;
  orderRecorded: boolean;
  error?: string;
}

export function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const listingId = searchParams.get("listing_id") || "";
  const accountId = searchParams.get("account_id") || "";

  const [data, setData] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError("Missing checkout session ID.");
      return;
    }

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadSession(attempt: number) {
      try {
        const params = new URLSearchParams({ session_id: sessionId });
        if (listingId) params.set("listing_id", listingId);
        if (accountId) params.set("account_id", accountId);

        const res = await fetch(`/api/stripe/session?${params.toString()}`);
        const json = (await res.json()) as SessionResponse;

        if (!res.ok) {
          throw new Error(json.error || "Unable to verify checkout session.");
        }

        if (!active) return;
        setData(json);
        setIsLoading(false);

        // If webhook hasn't finished recording the order yet, poll briefly
        if (!json.orderRecorded && attempt < 3) {
          retryTimer = setTimeout(() => {
            if (active) loadSession(attempt + 1);
          }, 2000);
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify checkout session."
        );
        setIsLoading(false);
      }
    }

    loadSession(0);

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [sessionId, listingId, accountId]);

  const paidAmount =
    data?.session?.amountTotal != null
      ? data.session.amountTotal / 100
      : data?.listing?.price ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-[#E4E6EB] bg-white p-6 shadow-xs sm:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="size-10 animate-spin text-[#1877F2]" />
              <h1 className="mt-4 text-lg font-bold text-[#050505]">
                Confirming your payment...
              </h1>
              <p className="mt-1 text-sm text-[#65676B]">
                Please wait while we verify your Stripe Checkout session.
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="size-6" />
              </span>
              <h1 className="mt-4 text-xl font-bold text-[#050505]">
                Could not verify order
              </h1>
              <p className="mt-1 text-sm text-[#65676B]">{error}</p>
              <Link
                href="/"
                className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1877F2] px-5 text-sm font-semibold text-white hover:bg-[#166FE5]"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Marketplace</span>
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-8" />
              </span>
              <h1 className="mt-4 text-2xl font-bold text-[#050505]">
                Payment Successful!
              </h1>
              <p className="mt-1 text-sm text-[#65676B]">
                Thank you for your purchase. Your payment has been processed via
                Stripe Connect.
              </p>

              {data?.listing && (
                <div className="mt-6 flex items-center gap-4 rounded-xl border border-[#E4E6EB] bg-[#F7F8FA] p-4 text-left">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[#E4E6EB]">
                    {data.listing.imageUrl ? (
                      <Image
                        src={data.listing.imageUrl}
                        alt={data.listing.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[#65676B]">
                        <ShoppingBag className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#050505]">
                      {data.listing.title}
                    </p>
                    {paidAmount !== null && (
                      <p className="text-sm font-bold text-[#050505]">
                        {formatPrice(paidAmount)}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        {data.listing.status === "sold"
                          ? "Marked as Sold"
                          : "Payment Confirmed"}
                      </span>
                      {data.orderRecorded && (
                        <span className="text-[#65676B]">
                          Order saved in database
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-lg bg-[#F7F8FA] px-4 py-3 text-left text-xs text-[#65676B]">
                <p>
                  Session ID:{" "}
                  <span className="font-mono text-[#050505]">{sessionId}</span>
                </p>
                {data?.session?.customerEmail && (
                  <p className="mt-1">
                    Receipt Email:{" "}
                    <span className="font-medium text-[#050505]">
                      {data.session.customerEmail}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                {data?.listing && (
                  <Link
                    href={`/item/${data.listing.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-[#CED0D4] bg-white px-5 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#F0F2F5]"
                  >
                    View Listing
                  </Link>
                )}
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Marketplace</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
