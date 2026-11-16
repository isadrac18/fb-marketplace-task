"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { MarketplaceHeader } from "./MarketplaceHeader";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SellerStatus {
  email: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
}

export function SellerConnectClient() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const isReturnSuccess = searchParams.get("success") === "true";
  const isRefresh = searchParams.get("refresh") === "true";
  const accountIdParam = searchParams.get("account_id") || "";

  const [email, setEmail] = useState(initialEmail);
  const [sellerStatus, setSellerStatus] = useState<SellerStatus | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(
    async (targetEmail: string, targetAccountId?: string) => {
      const normalized = targetEmail.trim().toLowerCase();
      if (!normalized && !targetAccountId) return;

      setIsChecking(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (normalized) params.set("email", normalized);
        if (targetAccountId) params.set("account_id", targetAccountId);

        const res = await fetch(`/api/stripe/connect?${params.toString()}`);
        const data = (await res.json()) as {
          connected?: boolean;
          seller?: SellerStatus | null;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || "Failed to check Stripe status.");
        }

        setSellerStatus(data.seller ?? null);
        setHasChecked(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check Stripe status."
        );
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialEmail || accountIdParam) {
      checkStatus(initialEmail, accountIdParam);
    }
  }, [initialEmail, accountIdParam, checkStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid seller email address.");
      return;
    }

    setError(null);
    setIsConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await res.json()) as {
        url?: string;
        error?: string;
        details?: string;
      };

      if (!res.ok || !data.url) {
        const message = data.details
          ? `${data.error || "Unable to start Stripe onboarding"}: ${data.details}`
          : data.error || "Unable to start Stripe onboarding.";
        throw new Error(message);
      }

      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect with Stripe."
      );
      setIsConnecting(false);
    }
  };

  const isOnboarded = Boolean(
    sellerStatus &&
      (sellerStatus.onboardingComplete || sellerStatus.chargesEnabled)
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#65676B] transition-colors hover:text-[#050505]"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Marketplace</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E4E6EB] bg-white shadow-xs">
          <div className="border-b border-[#E4E6EB] bg-[#F7F8FA] px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#635BFF] text-white shadow-xs">
                <CreditCard className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#050505]">
                  Seller Payouts · Connect with Stripe
                </h1>
                <p className="text-sm text-[#65676B]">
                  Accept instant &ldquo;Buy Now&rdquo; payments on your listings
                  (Stripe Sandbox).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {isRefresh && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Onboarding link expired</p>
                  <p className="mt-0.5 text-amber-800">
                    Click &ldquo;Connect with Stripe&rdquo; below to generate a
                    fresh onboarding link.
                  </p>
                </div>
              </div>
            )}

            {isReturnSuccess && isOnboarded && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">
                    Stripe onboarding complete for {sellerStatus?.email}!
                  </p>
                  <p className="mt-1 text-emerald-800">
                    Every listing associated with this email now displays a{" "}
                    <span className="font-semibold">Buy Now</span> button for
                    buyers.
                  </p>
                </div>
              </div>
            )}

            {isReturnSuccess && !isChecking && sellerStatus && !isOnboarded && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Onboarding still incomplete</p>
                  <p className="mt-1 text-amber-800">
                    Stripe still needs additional details before charges can be
                    enabled. Click &ldquo;Continue Onboarding&rdquo; below to
                    finish.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label
                  htmlFor="seller-connect-email"
                  className="mb-1.5 block text-sm font-semibold text-[#050505]"
                >
                  Seller Email
                </label>
                <p className="mb-2 text-xs text-[#65676B]">
                  Enter the exact email address you use when creating listings.
                  No login required.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="seller-connect-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@example.com"
                    className="h-10 flex-1 rounded-lg border border-[#CED0D4] bg-white px-3 text-sm text-[#050505] placeholder:text-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-2 focus:ring-[#1877F2]/20"
                  />
                  <button
                    type="button"
                    disabled={isChecking || !EMAIL_REGEX.test(email.trim())}
                    onClick={() => checkStatus(email)}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[#CED0D4] bg-[#F0F2F5] px-4 text-sm font-semibold text-[#050505] transition-colors hover:bg-[#E4E6EB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <span>Check Status</span>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {hasChecked && !isChecking && sellerStatus && (
                <div className="rounded-lg border border-[#E4E6EB] bg-[#F7F8FA] p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#050505]">
                      Account Status
                    </span>
                    {isOnboarded ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="size-3.5" />
                        Ready for Payments
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <AlertCircle className="size-3.5" />
                        Onboarding Incomplete
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-[#65676B]">
                    <p>
                      Email:{" "}
                      <span className="font-medium text-[#050505]">
                        {sellerStatus.email}
                      </span>
                    </p>
                    <p>
                      Stripe Account:{" "}
                      <span className="font-mono text-[#050505]">
                        {sellerStatus.stripeAccountId}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {hasChecked && !isChecking && !sellerStatus && (
                <div className="rounded-lg border border-[#E4E6EB] bg-[#F7F8FA] p-3.5 text-sm text-[#65676B]">
                  No Stripe Connect account found yet for{" "}
                  <span className="font-medium text-[#050505]">{email}</span>.
                  Click below to create one and complete onboarding.
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#635BFF] px-4 text-[15px] font-semibold text-white shadow-xs transition-colors hover:bg-[#5249F5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Redirecting to Stripe...</span>
                  </>
                ) : isOnboarded ? (
                  <>
                    <ExternalLink className="size-4" />
                    <span>Update Stripe Onboarding</span>
                  </>
                ) : sellerStatus ? (
                  <>
                    <ExternalLink className="size-4" />
                    <span>Continue Stripe Onboarding</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    <span>Connect with Stripe</span>
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-[#E4E6EB] pt-4 text-xs leading-relaxed text-[#65676B]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
                <div>
                  <p className="font-semibold text-[#050505]">
                    Sandbox Test Mode
                  </p>
                  <p className="mt-0.5">
                    Payments use a 10% platform fee via Stripe Connect direct
                    charges. Use Stripe&apos;s{" "}
                    <a
                      href="https://docs.stripe.com/connect/testing"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#1877F2] underline"
                    >
                      Connect test data
                    </a>{" "}
                    (e.g. test phone <span className="font-mono">000-000-0000</span>
                    , test SSN <span className="font-mono">0000</span>, test
                    routing/account numbers) to complete onboarding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
