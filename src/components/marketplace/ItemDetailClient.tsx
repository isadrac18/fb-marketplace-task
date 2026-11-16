"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Expand,
  ShoppingBag,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { useListings } from "@/lib/listings-store";
import { getCategoryBySlug } from "@/lib/categories";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { ListingCard, formatPrice } from "./ListingCard";
import { EmbeddedCheckoutModal } from "./EmbeddedCheckoutModal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const QUICK_MESSAGES = [
  "Hi, is this still available?",
  "Is the price negotiable?",
  "Where can we meet for pickup?",
];

export function ItemDetailClient({ id }: { id: string }) {
  const {
    listings,
    getListingById,
    upsertListing,
    messages,
    addMessage,
    mergeMessages,
  } = useListings();
  const listing = getListingById(id);

  const [isFetchingListing, setIsFetchingListing] = useState(!listing);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [messageText, setMessageText] = useState(QUICK_MESSAGES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [checkoutCanceled, setCheckoutCanceled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("canceled") === "true") {
        setCheckoutCanceled(true);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshListing() {
      try {
        const res = await fetch(`/api/listings/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = (await res.json()) as {
            listing?: import("@/lib/types").Listing;
          };
          if (active && data.listing) {
            upsertListing(data.listing);
          }
        }
      } catch {
        // Ignore background refresh error if cached listing exists
      }
    }
    refreshListing();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reloadToken]);

  useEffect(() => {
    let active = true;
    async function loadDetailAndMessages() {
      setFetchError(null);
      try {
        if (!listing) {
          setIsFetchingListing(true);
          const res = await fetch(`/api/listings/${encodeURIComponent(id)}`);
          if (res.ok) {
            const data = (await res.json()) as {
              listing?: import("@/lib/types").Listing;
            };
            if (active && data.listing) {
              upsertListing(data.listing);
            }
          } else if (res.status !== 404) {
            const errData = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            if (active) {
              setFetchError(errData.error || "Failed to load listing details.");
            }
          }
        }
        const msgRes = await fetch(
          `/api/messages?listingId=${encodeURIComponent(id)}`
        );
        if (msgRes.ok) {
          const msgData = (await msgRes.json()) as {
            messages?: import("@/lib/types").SellerMessage[];
          };
          if (active && Array.isArray(msgData.messages)) {
            mergeMessages(id, msgData.messages);
          }
        }
      } catch {
        if (active && !listing) {
          setFetchError("Unable to reach the server. Please try again.");
        }
      } finally {
        if (active) setIsFetchingListing(false);
      }
    }
    loadDetailAndMessages();
    return () => {
      active = false;
    };
  }, [id, listing, upsertListing, mergeMessages, reloadToken]);

  useEffect(() => {
    if (!isImageOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsImageOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageOpen]);

  if (!listing) {
    if (isFetchingListing) {
      return (
        <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
          <MarketplaceHeader />
          <main
            aria-busy="true"
            aria-live="polite"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6"
          >
            <div className="mb-4 flex items-center gap-2 text-sm text-[#65676B]">
              <Loader2 className="size-4 animate-spin text-[#1877F2]" />
              <span>Loading listing details...</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#E4E6EB] bg-white shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="flex items-center justify-center bg-[#1C1E21]/90 p-4 sm:p-8 lg:col-span-7">
                  <div className="aspect-square w-full max-w-[540px] animate-pulse rounded-xl bg-white/10" />
                </div>
                <div className="space-y-4 p-5 sm:p-6 lg:col-span-5">
                  <div className="h-7 w-3/4 animate-pulse rounded bg-[#E4E6EB]" />
                  <div className="h-7 w-1/3 animate-pulse rounded bg-[#E4E6EB]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[#E4E6EB]" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-[#E4E6EB]" />
                  <div className="border-t border-[#E4E6EB] pt-4 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-[#E4E6EB]" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-[#E4E6EB]" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[#E4E6EB]" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }
    if (fetchError) {
      return (
        <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
          <MarketplaceHeader />
          <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </span>
            <h1 className="mt-3 text-xl font-bold text-[#050505]">
              Unable to load listing
            </h1>
            <p className="mt-1.5 text-sm text-[#65676B]">{fetchError}</p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReloadToken((n) => n + 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
              >
                <RefreshCw className="size-4" />
                <span>Try again</span>
              </button>
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#E4E6EB] px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#D8DADF]"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Marketplace</span>
              </Link>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
        <MarketplaceHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#050505]">
            Listing not found
          </h1>
          <p className="mt-2 text-sm text-[#65676B]">
            This item may have been removed or the link is incorrect.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1877F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Marketplace</span>
          </Link>
        </main>
      </div>
    );
  }

  const category = getCategoryBySlug(listing.category);
  const relatedListings = listings
    .filter(
      (item) => item.category === listing.category && item.id !== listing.id
    )
    .slice(0, 5);

  const itemMessages = messages.filter((m) => m.listingId === listing.id);

  const sellerInitials = listing.sellerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const listedDate = new Date(listing.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(listing.sellerEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard API unavailable in non-secure context
    }
  };

  const handleBuyNow = () => {
    if (!listing) return;
    setBuyError(null);
    setCheckoutCanceled(false);
    setShowCheckoutModal(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(buyerEmail.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!messageText.trim()) {
      setFormError("Please enter a message for the seller.");
      return;
    }

    setFormError(null);
    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          buyerEmail: buyerEmail.trim(),
          sellerEmail: listing.sellerEmail,
          message: messageText.trim(),
        }),
      });

      const data = (await res.json()) as {
        message?: import("@/lib/types").SellerMessage;
        error?: string;
      };

      if (!res.ok || !data.message) {
        throw new Error(data.error || "Failed to send message.");
      }

      addMessage(data.message);
      setSentSuccess(true);
      setIsMessaging(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to send message."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* Back navigation & Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#65676B]"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold text-[#050505] transition-colors hover:bg-[#E4E6EB]/70 hover:text-[#1877F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Marketplace</span>
          </Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={`/category/${category.slug}`}
                className="rounded-md px-1.5 py-0.5 font-medium transition-colors hover:text-[#1877F2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
              >
                {category.name}
              </Link>
            </>
          )}
        </nav>

        {/* Main Detail Card */}
        <div className="overflow-hidden rounded-xl border border-[#E4E6EB] bg-white shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Large Image Display */}
            <div className="relative flex items-center justify-center bg-[#1C1E21] p-4 sm:p-8 lg:col-span-7">
              <button
                type="button"
                onClick={() => setIsImageOpen(true)}
                aria-label={`View full size photo of ${listing.title}`}
                className="group relative aspect-square w-full max-w-[540px] overflow-hidden rounded-xl bg-[#F0F2F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1E21]"
              >
                <Image
                  src={listing.imageUrl}
                  alt={listing.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 540px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white opacity-90 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                  <Expand className="size-3.5" />
                  <span>Expand</span>
                </span>
              </button>
            </div>

            {/* Right: Item Details, Seller Info & Message Seller */}
            <div className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-5">
              <div>
                <h1 className="text-2xl font-bold leading-snug text-[#050505]">
                  {listing.title}
                </h1>
                <p className="mt-1.5 text-2xl font-bold text-[#050505]">
                  {formatPrice(listing.price)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#65676B]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4 shrink-0" />
                    <span>{listing.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Listed {listedDate}</span>
                  </span>
                </div>

                {/* Buy Now / Sold Status */}
                <div className="mt-5 space-y-2.5">
                  {checkoutCanceled && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
                      <span>Checkout was canceled. No charge was made.</span>
                      <button
                        type="button"
                        onClick={() => setCheckoutCanceled(false)}
                        aria-label="Dismiss canceled notice"
                        className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}

                  {buyError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{buyError}</span>
                    </div>
                  )}

                  {listing.status === "sold" ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      <ShoppingBag className="size-4" />
                      <span>Sold · This item is no longer available</span>
                    </div>
                  ) : listing.price > 0 ? (
                    <div>
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#635BFF] px-4 text-[15px] font-semibold text-white shadow-xs transition-colors hover:bg-[#5249F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2"
                      >
                        <CreditCard className="size-5" />
                        <span>Buy Now · {formatPrice(listing.price)}</span>
                      </button>
                      <p className="mt-1.5 text-center text-xs text-[#65676B]">
                        Instant embedded checkout powered by Stripe
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#E4E6EB] bg-[#F7F8FA] px-3.5 py-2.5 text-xs text-[#65676B]">
                      This item is listed as Free. Message the seller to arrange pickup.
                    </div>
                  )}
                </div>

                {/* Message Seller CTA & Form */}
                <div className="mt-5" aria-live="polite">
                  {sentSuccess && !isMessaging && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                        <span>Message sent to {listing.sellerName}!</span>
                      </div>
                      <p className="mt-1 text-emerald-800">
                        Your inquiry was recorded for{" "}
                        <span className="font-medium">{buyerEmail}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMessaging(true)}
                        className="mt-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
                      >
                        Send another message
                      </button>
                    </div>
                  )}

                  {!isMessaging ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setIsMessaging(true);
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#166FE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2"
                    >
                      <MessageCircle className="size-5" />
                      <span>Message Seller</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSendMessage}
                      noValidate
                      className="space-y-3 rounded-xl border border-[#CED0D4] bg-[#F0F2F5]/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#050505]">
                          Send seller a message
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMessaging(false)}
                          className="text-xs font-semibold text-[#65676B] hover:text-[#050505]"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Quick message chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_MESSAGES.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMessageText(preset)}
                            className="rounded-full border border-[#CED0D4] bg-white px-2.5 py-1 text-xs font-medium text-[#050505] transition-colors hover:border-[#1877F2] hover:bg-[#E7F3FF] hover:text-[#1877F2]"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {formError && (
                        <p
                          role="alert"
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                        >
                          <AlertCircle className="size-3.5 shrink-0" />
                          <span>{formError}</span>
                        </p>
                      )}

                      <div>
                        <label
                          htmlFor="buyerEmail"
                          className="mb-1 block text-xs font-semibold text-[#65676B]"
                        >
                          Your email
                        </label>
                        <input
                          id="buyerEmail"
                          type="email"
                          required
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="buyer@example.com"
                          className="h-9 w-full rounded-lg border border-[#CED0D4] bg-white px-3 text-sm text-[#050505] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="buyerMessage"
                          className="mb-1 block text-xs font-semibold text-[#65676B]"
                        >
                          Message
                        </label>
                        <textarea
                          id="buyerMessage"
                          rows={3}
                          required
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="w-full rounded-lg border border-[#CED0D4] bg-white px-3 py-2 text-sm text-[#050505] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSending}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1877F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="size-4" />
                        <span>{isSending ? "Sending..." : "Send message"}</span>
                      </button>
                    </form>
                  )}

                  {itemMessages.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-[#E4E6EB] bg-[#F0F2F5]/50 p-3">
                      <p className="text-xs font-semibold text-[#65676B]">
                        Your sent messages ({itemMessages.length})
                      </p>
                      {itemMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-md bg-white px-2.5 py-2 text-xs text-[#050505] shadow-2xs"
                        >
                          <p className="font-medium">{msg.message}</p>
                          <p className="mt-0.5 text-[11px] text-[#65676B]">
                            From {msg.buyerEmail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="my-5 border-t border-[#E4E6EB]" />

                {/* Details */}
                <h2 className="text-[17px] font-bold text-[#050505]">
                  Details
                </h2>
                <dl className="mt-2.5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#65676B]">Condition</dt>
                    <dd className="font-semibold text-[#050505]">
                      {listing.condition}
                    </dd>
                  </div>
                  {category && (
                    <div className="flex items-center justify-between">
                      <dt className="text-[#65676B]">Category</dt>
                      <dd>
                        <Link
                          href={`/category/${category.slug}`}
                          className="inline-flex items-center gap-1 font-semibold text-[#1877F2] hover:underline"
                        >
                          <Tag className="size-3.5" />
                          <span>{category.name}</span>
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>

                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-[#050505]">
                  {listing.description}
                </p>

                <div className="my-5 border-t border-[#E4E6EB]" />

                {/* Seller Information */}
                <div>
                  <h2 className="text-[17px] font-bold text-[#050505]">
                    Seller information
                  </h2>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
                        {sellerInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#050505]">
                          {listing.sellerName}
                        </p>
                        <p className="truncate text-xs text-[#65676B]">
                          {listing.sellerEmail || "Contact via Message Seller"}
                        </p>
                      </div>
                    </div>
                    {listing.sellerEmail && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyEmail}
                          aria-label="Copy seller email"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E4E6EB] bg-[#F0F2F5] px-2.5 text-xs font-semibold text-[#050505] transition-colors hover:bg-[#E4E6EB]"
                        >
                          {copiedEmail ? (
                            <>
                              <Check className="size-3.5 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`mailto:${listing.sellerEmail}?subject=${encodeURIComponent(
                            `Marketplace Inquiry: ${listing.title}`
                          )}`}
                          aria-label={`Email ${listing.sellerName}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E4E6EB] bg-[#F0F2F5] text-[#050505] transition-colors hover:bg-[#E4E6EB]"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#F0F2F5] px-3 py-2.5 text-xs text-[#65676B]">
                <ShieldCheck className="size-4 shrink-0 text-[#1877F2]" />
                <span>
                  Meet in a public place and inspect items before purchasing.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Listings */}
        {relatedListings.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#050505]">
                More in {category?.name ?? "this category"}
              </h2>
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="text-sm font-semibold text-[#1877F2] hover:underline"
                >
                  See all
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {relatedListings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      {showCheckoutModal && (
        <EmbeddedCheckoutModal
          listingId={listing.id}
          listingTitle={listing.title}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            upsertListing({
              ...listing,
              status: "sold",
            });
          }}
        />
      )}

      {/* Accessible Image Lightbox */}
      {isImageOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full size image of ${listing.title}`}
          onClick={() => setIsImageOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setIsImageOpen(false)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            width={1200}
            height={1200}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
