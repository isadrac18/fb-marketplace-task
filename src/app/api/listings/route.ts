import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseClient,
  mapDbListingToListing,
  type DbListingRow,
} from "@/lib/supabase";
import { MOCK_LISTINGS } from "@/lib/mock-data";
import { getCategoryBySlug } from "@/lib/categories";
import { makeProductImage } from "@/lib/mock-images";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LISTING_COLUMNS =
  "id, title, description, price, category, seller_email, image_url, location, created_at";

const LISTINGS_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim() || "";
    const query = searchParams.get("q")?.trim() || "";
    const limitParam = Number(searchParams.get("limit") ?? "50");
    const offsetParam = Number(searchParams.get("offset") ?? "0");

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const supabase = getSupabaseClient();

    if (supabase) {
      let dbQuery = supabase
        .from("listings")
        .select(LISTING_COLUMNS, { count: "estimated" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }

      if (query) {
        const escaped = query.replace(/[%_]/g, "\\$&");
        dbQuery = dbQuery.or(
          `title.ilike.%${escaped}%,description.ilike.%${escaped}%,location.ilike.%${escaped}%`
        );
      }

      const { data, error, count } = await dbQuery;

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch listings", details: error.message },
          { status: 500 }
        );
      }

      const listings = ((data ?? []) as DbListingRow[]).map(
        mapDbListingToListing
      );

      return NextResponse.json(
        {
          listings,
          total: count ?? listings.length,
          source: "supabase",
        },
        { headers: LISTINGS_CACHE_HEADERS }
      );
    }

    // Fallback to mock data when Supabase env vars are not configured
    const lowerQ = query.toLowerCase();
    const filtered = MOCK_LISTINGS.filter((item) => {
      if (category && item.category !== category) return false;
      if (!lowerQ) return true;
      return (
        item.title.toLowerCase().includes(lowerQ) ||
        item.description.toLowerCase().includes(lowerQ) ||
        item.location.toLowerCase().includes(lowerQ)
      );
    });

    const sliced = filtered
      .slice(offset, offset + limit)
      .map((item) => ({ ...item, sellerEmail: "" }));

    return NextResponse.json(
      {
        listings: sliced,
        total: filtered.length,
        source: "mock",
      },
      { headers: LISTINGS_CACHE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while fetching listings",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`listings:post:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before posting again." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const sellerEmail =
      typeof body.sellerEmail === "string"
        ? body.sellerEmail.trim()
        : typeof body.seller_email === "string"
          ? body.seller_email.trim()
          : "";
    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : "Palo Alto, CA";
    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : typeof body.image_url === "string"
          ? body.image_url.trim()
          : "";
    const parsedPrice =
      typeof body.price === "number"
        ? body.price
        : typeof body.price === "string" && body.price.trim() !== ""
          ? Number(body.price)
          : NaN;

    const fieldErrors: Record<string, string> = {};

    if (!title || title.length < 3) {
      fieldErrors.title = "Title must be at least 3 characters.";
    } else if (title.length > 255) {
      fieldErrors.title = "Title must be 255 characters or fewer.";
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      fieldErrors.price = "Price must be a valid non-negative number.";
    }

    if (!category || !getCategoryBySlug(category)) {
      fieldErrors.category = "A valid marketplace category is required.";
    }

    if (!sellerEmail || !EMAIL_REGEX.test(sellerEmail)) {
      fieldErrors.sellerEmail = "A valid seller email is required.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors },
        { status: 400 }
      );
    }

    const resolvedImageUrl =
      imageUrl ||
      makeProductImage(
        title.slice(0, 18),
        "🏷️",
        "#E8F0FE",
        "#D2E3FC",
        "#1877F2"
      );

    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("listings")
        .insert({
          title,
          description: description || "No additional description provided.",
          price: parsedPrice,
          category,
          seller_email: sellerEmail,
          image_url: resolvedImageUrl,
          location,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create listing", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          listing: mapDbListingToListing(data as DbListingRow),
          source: "supabase",
        },
        { status: 201 }
      );
    }

    // Fallback response when Supabase env vars are not configured
    const mockListing = {
      id: `item-${Date.now()}`,
      title,
      price: parsedPrice,
      description: description || "No additional description provided.",
      category,
      location,
      imageUrl: resolvedImageUrl,
      sellerName: sellerEmail.split("@")[0] || "Seller",
      sellerEmail: "",
      condition: "Used - Good" as const,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { listing: mockListing, source: "mock" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while creating listing",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
