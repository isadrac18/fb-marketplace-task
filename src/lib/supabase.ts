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

export function mapDbListingToListing(row: DbListingRow): Listing {
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
