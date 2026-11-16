import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Listing, SellerMessage } from "./types";

export interface DbListingRow {
  id: string;
  title: string;
  description: string | null;
  price: number | string;
  category: string;
  seller_email: string;
  image_url: string | null;
  location: string | null;
  status?: string | null;
  sold_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DbMessageRow {
  id: string;
  listing_id: string;
  buyer_email: string;
  seller_email: string;
  message: string;
  created_at: string;
}

export interface DbSellerRow {
  id: string;
  email: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key && url.startsWith("http"));
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  );
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (url && serviceRoleKey && url.startsWith("http")) {
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return getSupabaseClient();
}

export async function getOnboardedSellerEmails(
  supabase: SupabaseClient,
  emails: string[]
): Promise<Set<string>> {
  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (normalized.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("sellers")
    .select("email, onboarding_complete, charges_enabled")
    .in("email", normalized);

  if (error || !data) {
    return new Set();
  }

  const onboarded = new Set<string>();
  for (const row of data as Array<{
    email: string;
    onboarding_complete?: boolean;
    charges_enabled?: boolean;
  }>) {
    if (row.onboarding_complete || row.charges_enabled) {
      onboarded.add(row.email.trim().toLowerCase());
    }
  }
  return onboarded;
}

export function mapDbListingToListing(
  row: DbListingRow,
  options?: { sellerOnboarded?: boolean }
): Listing {
  const email = row.seller_email || "";
  return {
    id: row.id,
    title: row.title,
    price: typeof row.price === "string" ? Number(row.price) : row.price,
    description: row.description ?? "",
    category: row.category,
    location: row.location ?? "Palo Alto, CA",
    imageUrl: row.image_url ?? "",
    sellerName: email.split("@")[0] || "Marketplace Seller",
    // Redact raw seller email from public API responses to prevent PII scraping
    sellerEmail: "",
    condition: "Used - Good",
    status: row.status === "sold" ? "sold" : "available",
    sellerOnboarded: options?.sellerOnboarded ?? false,
    createdAt: row.created_at,
  };
}

export function mapDbMessageToSellerMessage(
  row: DbMessageRow
): SellerMessage {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerEmail: row.buyer_email,
    message: row.message,
    createdAt: row.created_at,
  };
}
