import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { calculatePlatformFeeCents, getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Unable to read request body" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Webhook signature verification failed",
        details: err instanceof Error ? err.message : "Invalid signature",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const listingId = session.metadata?.listing_id?.trim();

        // Shared sandbox: ignore checkout events without our listing_id metadata
        if (!listingId) {
          return NextResponse.json({ received: true, ignored: true });
        }

        // Verify this listing actually belongs to our Supabase database
        const { data: listing, error: listingLookupError } = await supabase
          .from("listings")
          .select("id, seller_email, price, status")
          .eq("id", listingId)
          .maybeSingle<{
            id: string;
            seller_email: string;
            price: number | string;
            status: string | null;
          }>();

        if (listingLookupError) {
          return NextResponse.json(
            { error: "Database error looking up listing" },
            { status: 500 }
          );
        }

        if (!listing) {
          // Shared sandbox: event is from another candidate's app
          return NextResponse.json({ received: true, ignored: true });
        }

        // Only process paid sessions (or mark sold when payment_status is paid / no_payment_required)
        if (
          session.payment_status === "paid" ||
          session.payment_status === "no_payment_required"
        ) {
          const amountCents =
            session.amount_total ??
            Math.round(
              (typeof listing.price === "string"
                ? Number(listing.price)
                : listing.price) * 100
            );
          const platformFeeCents = session.metadata?.platform_fee_cents
            ? Number(session.metadata.platform_fee_cents)
            : calculatePlatformFeeCents(amountCents);

          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          // 1. Mark listing as Sold
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              status: "sold",
              sold_at: new Date().toISOString(),
            })
            .eq("id", listing.id);

          if (updateError) {
            return NextResponse.json(
              { error: "Failed to mark listing as sold", details: updateError.message },
              { status: 500 }
            );
          }

          // 2. Record the order in Supabase (idempotent via stripe_session_id)
          const { error: orderError } = await supabase.from("orders").upsert(
            {
              listing_id: listing.id,
              seller_email: listing.seller_email.trim().toLowerCase(),
              buyer_email:
                session.customer_details?.email ||
                session.customer_email ||
                null,
              amount_cents: amountCents,
              platform_fee_cents: Number.isFinite(platformFeeCents)
                ? platformFeeCents
                : 0,
              stripe_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              stripe_account_id: event.account ?? null,
              status: "paid",
            },
            { onConflict: "stripe_session_id" }
          );

          if (orderError) {
            return NextResponse.json(
              { error: "Failed to record order", details: orderError.message },
              { status: 500 }
            );
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Check if this connected account belongs to one of our sellers
        const { data: seller, error: sellerLookupError } = await supabase
          .from("sellers")
          .select("id")
          .eq("stripe_account_id", account.id)
          .maybeSingle<{ id: string }>();

        if (sellerLookupError) {
          return NextResponse.json(
            { error: "Database error looking up seller" },
            { status: 500 }
          );
        }

        if (!seller) {
          // Shared sandbox: ignore accounts from other candidates
          return NextResponse.json({ received: true, ignored: true });
        }

        const chargesEnabled = Boolean(account.charges_enabled);
        const payoutsEnabled = Boolean(account.payouts_enabled);
        const onboardingComplete = Boolean(
          account.details_submitted && account.charges_enabled
        );

        await supabase
          .from("sellers")
          .update({
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            onboarding_complete: onboardingComplete,
          })
          .eq("id", seller.id);
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Webhook handler error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
