import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id")?.trim() || "";
    const listingId = searchParams.get("listing_id")?.trim() || "";
    const accountId = searchParams.get("account_id")?.trim() || "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const stripe = getStripeClient();
    const supabase = getSupabaseAdminClient();

    let resolvedAccountId = accountId;

    // If account_id wasn't in the URL, try looking it up via the listing's seller
    if (!resolvedAccountId && supabase && listingId) {
      const { data: listing } = await supabase
        .from("listings")
        .select("seller_email")
        .eq("id", listingId)
        .maybeSingle<{ seller_email: string }>();

      if (listing?.seller_email) {
        const { data: seller } = await supabase
          .from("sellers")
          .select("stripe_account_id")
          .eq("email", listing.seller_email.trim().toLowerCase())
          .maybeSingle<{ stripe_account_id: string }>();

        if (seller?.stripe_account_id) {
          resolvedAccountId = seller.stripe_account_id;
        }
      }
    }

    let stripeSessionData: {
      id: string;
      paymentStatus: string;
      amountTotal: number | null;
      currency: string | null;
      customerEmail: string | null;
      listingId: string | null;
    } | null = null;

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          sessionId,
          resolvedAccountId ? { stripeAccount: resolvedAccountId } : undefined
        );
        stripeSessionData = {
          id: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          customerEmail:
            session.customer_details?.email || session.customer_email || null,
          listingId: session.metadata?.listing_id || listingId || null,
        };
      } catch {
        // Fallback to DB order lookup if Stripe retrieve fails
      }
    }

    const effectiveListingId = stripeSessionData?.listingId || listingId;
    let listingSummary: {
      id: string;
      title: string;
      price: number;
      imageUrl: string;
      status: string;
    } | null = null;

    let orderRecorded = false;

    if (supabase) {
      if (effectiveListingId) {
        const { data: listing } = await supabase
          .from("listings")
          .select("id, title, price, image_url, status")
          .eq("id", effectiveListingId)
          .maybeSingle<{
            id: string;
            title: string;
            price: number | string;
            image_url: string | null;
            status: string | null;
          }>();

        if (listing) {
          listingSummary = {
            id: listing.id,
            title: listing.title,
            price:
              typeof listing.price === "string"
                ? Number(listing.price)
                : listing.price,
            imageUrl: listing.image_url || "",
            status: listing.status || "available",
          };
        }
      }

      const { data: order } = await supabase
        .from("orders")
        .select("id, status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle<{ id: string; status: string }>();

      orderRecorded = Boolean(order);
    }

    return NextResponse.json(
      {
        session: stripeSessionData,
        listing: listingSummary,
        orderRecorded,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to load checkout session",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
