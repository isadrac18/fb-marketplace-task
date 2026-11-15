import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseClient,
  mapDbMessageToSellerMessage,
  type DbMessageRow,
} from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_COLUMNS =
  "id, listing_id, buyer_email, seller_email, message, created_at";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId")?.trim();
    const buyerEmail = searchParams.get("buyerEmail")?.trim();

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId query parameter is required" },
        { status: 400 }
      );
    }

    // Require buyerEmail to scope message reads and prevent public PII scraping
    if (!buyerEmail || !EMAIL_REGEX.test(buyerEmail)) {
      return NextResponse.json(
        { messages: [], source: "restricted" },
        { headers: NO_STORE_HEADERS }
      );
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("listing_id", listingId)
        .eq("buyer_email", buyerEmail)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch messages", details: error.message },
          { status: 500 }
        );
      }

      const messages = ((data ?? []) as DbMessageRow[]).map(
        mapDbMessageToSellerMessage
      );

      return NextResponse.json(
        { messages, source: "supabase" },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { messages: [], source: "mock" },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while fetching messages",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`messages:post:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many messages sent. Please wait a moment." },
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

    const listingId =
      typeof body.listingId === "string"
        ? body.listingId.trim()
        : typeof body.listing_id === "string"
          ? body.listing_id.trim()
          : "";
    const buyerEmail =
      typeof body.buyerEmail === "string"
        ? body.buyerEmail.trim()
        : typeof body.buyer_email === "string"
          ? body.buyer_email.trim()
          : "";
    const sellerEmailInput =
      typeof body.sellerEmail === "string"
        ? body.sellerEmail.trim()
        : typeof body.seller_email === "string"
          ? body.seller_email.trim()
          : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const fieldErrors: Record<string, string> = {};

    if (!listingId) {
      fieldErrors.listingId = "Listing ID is required.";
    }
    if (!buyerEmail || !EMAIL_REGEX.test(buyerEmail)) {
      fieldErrors.buyerEmail = "A valid buyer email is required.";
    }
    if (!message) {
      fieldErrors.message = "Message cannot be empty.";
    } else if (message.length > 2000) {
      fieldErrors.message = "Message must be 2000 characters or fewer.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      let resolvedSellerEmail = sellerEmailInput;

      // Verify listing exists and get seller_email if not provided
      const { data: listingRow, error: listingError } = await supabase
        .from("listings")
        .select("id, seller_email")
        .eq("id", listingId)
        .maybeSingle();

      if (listingError) {
        return NextResponse.json(
          { error: "Failed to verify listing", details: listingError.message },
          { status: 500 }
        );
      }

      if (!listingRow) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      resolvedSellerEmail =
        listingRow.seller_email || resolvedSellerEmail || "seller@example.com";

      const { data, error } = await supabase
        .from("messages")
        .insert({
          listing_id: listingId,
          buyer_email: buyerEmail,
          seller_email: resolvedSellerEmail,
          message,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to save message", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: mapDbMessageToSellerMessage(data as DbMessageRow),
          source: "supabase",
        },
        { status: 201 }
      );
    }

    const mockMessage = {
      id: `msg-${Date.now()}`,
      listingId,
      buyerEmail,
      message,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { message: mockMessage, source: "mock" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error while sending message",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
