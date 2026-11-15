import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseClient,
  mapDbListingToListing,
  type DbListingRow,
} from "@/lib/supabase";
import { MOCK_LISTINGS } from "@/lib/mock-data";

const LISTING_COLUMNS =
  "id, title, description, price, category, seller_email, image_url, location, created_at";

const DETAIL_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const trimmedId = id?.trim();

    if (!trimmedId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("id", trimmedId)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch listing", details: error.message },
          { status: 500 }
        );
      }

      if (data) {
        return NextResponse.json(
          {
            listing: mapDbListingToListing(data as DbListingRow),
            source: "supabase",
          },
          { headers: DETAIL_CACHE_HEADERS }
        );
      }

      // Allow mock IDs to resolve gracefully if not in DB yet
      const mockMatch = MOCK_LISTINGS.find((item) => item.id === trimmedId);
      if (mockMatch) {
        return NextResponse.json(
          { listing: { ...mockMatch, sellerEmail: "" }, source: "mock" },
          { headers: DETAIL_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const mockListing = MOCK_LISTINGS.find((item) => item.id === trimmedId);
    if (!mockListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { listing: { ...mockListing, sellerEmail: "" }, source: "mock" },
      { headers: DETAIL_CACHE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while fetching listing",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
