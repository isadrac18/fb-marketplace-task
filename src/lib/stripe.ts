import Stripe from "stripe";
import type { NextRequest } from "next/server";

export const PLATFORM_FEE_PERCENT = 10;

let cachedStripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return Boolean(key && key.startsWith("sk_"));
}

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return null;
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(key);
  }
  return cachedStripe;
}

export function calculatePlatformFeeCents(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export function getAppOrigin(request: NextRequest): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return request.nextUrl.origin;
}
