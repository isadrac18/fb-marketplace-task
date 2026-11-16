import Stripe from "stripe";
import type { NextRequest } from "next/server";

export const PLATFORM_FEE_PERCENT = 10;
export const STRIPE_V2_VERSION = "2026-10-28.endive";

let cachedStripe: Stripe | null = null;

export async function stripeV2Request<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const res = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = (await res.json()) as T & {
    error?: { message?: string; code?: string };
  };

  if (!res.ok) {
    throw new Error(
      data.error?.message || `Stripe v2 API error (${res.status})`
    );
  }

  return data;
}

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
