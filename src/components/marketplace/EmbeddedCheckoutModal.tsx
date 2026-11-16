"use client";

import { useCallback, useRef, useState } from "react";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CheckCircle2, Loader2, X } from "lucide-react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface EmbeddedCheckoutModalProps {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmbeddedCheckoutModal({
  listingId,
  listingTitle,
  onClose,
  onSuccess,
}: EmbeddedCheckoutModalProps) {
  const sessionIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });

    const data = (await res.json()) as {
      clientSecret?: string;
      sessionId?: string;
      error?: string;
      details?: string;
    };

    if (!res.ok || !data.clientSecret) {
      const message = data.details
        ? `${data.error || "Unable to start checkout"}: ${data.details}`
        : data.error || "Unable to start checkout.";
      setError(message);
      throw new Error(message);
    }

    sessionIdRef.current = data.sessionId ?? null;
    return data.clientSecret;
  }, [listingId]);

  const handleComplete = useCallback(async () => {
    setConfirming(true);
    try {
      if (sessionIdRef.current) {
        await fetch(
          `/api/stripe/session?session_id=${encodeURIComponent(sessionIdRef.current)}&listing_id=${encodeURIComponent(listingId)}`
        );
      }
      setCompleted(true);
      onSuccess();
    } catch {
      setCompleted(true);
      onSuccess();
    } finally {
      setConfirming(false);
    }
  }, [listingId, onSuccess]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout for ${listingTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E4E6EB] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4E6EB] bg-white px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-[#050505]">
              Complete Purchase
            </h2>
            <p className="truncate text-xs text-[#65676B]">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded-full p-1.5 text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#050505]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5">
          {!stripePromise ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Stripe publishable key (<code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>) is not configured.
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : completed ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="size-12 text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-[#050505]">
                Payment successful!
              </h3>
              <p className="mt-1 text-sm text-[#65676B]">
                &ldquo;{listingTitle}&rdquo; has been marked as sold.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5]"
              >
                Done
              </button>
            </div>
          ) : confirming ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#65676B]">
              <Loader2 className="size-5 animate-spin text-[#635BFF]" />
              <span>Confirming your order...</span>
            </div>
          ) : (
            <div id="checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  fetchClientSecret,
                  onComplete: handleComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
