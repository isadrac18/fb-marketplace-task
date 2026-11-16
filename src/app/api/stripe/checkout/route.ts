import { NextRequest, NextResponse } from "next/server";
import {
  calculatePlatformFeeCents,
  getAppOrigin,
  getStripeClient,
} from "@/lib/stripe";
import {
  getSupabaseAdminClient,
  type DbListingRow,
  type DbSellerRow,
} from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server." },
        { status: 503 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 }
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
      typeof body.listingId === "string" ? body.listingId.trim() : "";

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, description, price, seller_email, image_url, status")
      .eq("id", listingId)
      .maybeSingle<DbListingRow>();

    if (listingError) {
      return NextResponse.json(
        { error: "Failed to load listing", details: listingError.message },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status === "sold") {
      return NextResponse.json(
        { error: "This item has already been sold." },
        { status: 400 }
      );
    }

    const numericPrice =
      typeof listing.price === "string" ? Number(listing.price) : listing.price;
    const amountCents = Math.round(numericPrice * 100);

    if (!Number.isFinite(amountCents) || amountCents < 50) {
      return NextResponse.json(
        { error: "Listing price must be at least $0.50 for online checkout." },
        { status: 400 }
      );
    }

    const sellerEmail = listing.seller_email.trim().toLowerCase();
    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", sellerEmail)
      .maybeSingle<DbSellerRow>();

    if (sellerError) {
      return NextResponse.json(
        { error: "Failed to verify seller payout account", details: sellerError.message },
        { status: 500 }
      );
    }

    if (
      !seller ||
      !seller.stripe_account_id ||
      (!seller.onboarding_complete && !seller.charges_enabled)
    ) {
      return NextResponse.json(
        { error: "This seller has not completed Stripe onboarding yet." },
        { status: 400 }
      );
    }

    const platformFeeCents = calculatePlatformFeeCents(amountCents);
    const origin = getAppOrigin(request);

    // Only pass HTTP(S) image URLs to Stripe (skip data: URLs)
    const productImages =
      listing.image_url && listing.image_url.startsWith("http")
        ? [listing.image_url]
        : undefined;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: listing.title,
                description: listing.description
                  ? listing.description.slice(0, 500)
                  : undefined,
                images: productImages,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          metadata: {
            listing_id: listing.id,
            seller_email: sellerEmail,
            platform_fee_cents: String(platformFeeCents),
          },
        },
        metadata: {
          listing_id: listing.id,
          seller_email: sellerEmail,
          platform_fee_cents: String(platformFeeCents),
        },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${encodeURIComponent(listing.id)}&account_id=${encodeURIComponent(seller.stripe_account_id)}`,
        cancel_url: `${origin}/item/${encodeURIComponent(listing.id)}?canceled=true`,
      },
      {
        stripeAccount: seller.stripe_account_id,
      }
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to create Stripe Checkout session",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
