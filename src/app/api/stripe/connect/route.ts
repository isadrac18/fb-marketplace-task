import { NextRequest, NextResponse } from "next/server";
import { getAppOrigin, getStripeClient } from "@/lib/stripe";
import { getSupabaseAdminClient, type DbSellerRow } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email")?.trim().toLowerCase() || "";
    const accountIdParam = searchParams.get("account_id")?.trim() || "";

    if (!emailParam && !accountIdParam) {
      return NextResponse.json(
        { error: "email or account_id query parameter is required" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    let query = supabase.from("sellers").select("*");
    if (emailParam) {
      query = query.eq("email", emailParam);
    } else {
      query = query.eq("stripe_account_id", accountIdParam);
    }

    const { data: seller, error } = await query.maybeSingle<DbSellerRow>();

    if (error) {
      return NextResponse.json(
        { error: "Failed to look up seller", details: error.message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!seller) {
      return NextResponse.json(
        { connected: false, seller: null },
        { headers: NO_STORE_HEADERS }
      );
    }

    const stripe = getStripeClient();
    if (stripe && seller.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(seller.stripe_account_id);
        const chargesEnabled = Boolean(account.charges_enabled);
        const payoutsEnabled = Boolean(account.payouts_enabled);
        const onboardingComplete = Boolean(
          account.details_submitted && account.charges_enabled
        );

        if (
          chargesEnabled !== seller.charges_enabled ||
          payoutsEnabled !== seller.payouts_enabled ||
          onboardingComplete !== seller.onboarding_complete
        ) {
          await supabase
            .from("sellers")
            .update({
              charges_enabled: chargesEnabled,
              payouts_enabled: payoutsEnabled,
              onboarding_complete: onboardingComplete,
            })
            .eq("id", seller.id);
        }

        return NextResponse.json(
          {
            connected: true,
            seller: {
              email: seller.email,
              stripeAccountId: seller.stripe_account_id,
              onboardingComplete,
              chargesEnabled,
              payoutsEnabled,
              detailsSubmitted: Boolean(account.details_submitted),
            },
          },
          { headers: NO_STORE_HEADERS }
        );
      } catch {
        // Fall back to cached Supabase values if Stripe retrieve fails
      }
    }

    return NextResponse.json(
      {
        connected: true,
        seller: {
          email: seller.email,
          stripeAccountId: seller.stripe_account_id,
          onboardingComplete: seller.onboarding_complete,
          chargesEnabled: seller.charges_enabled,
          payoutsEnabled: seller.payouts_enabled,
          detailsSubmitted: seller.onboarding_complete,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected error checking Stripe Connect status",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server (missing STRIPE_SECRET_KEY)." },
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

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid seller email address." },
        { status: 400 }
      );
    }

    // Check if seller already has a connected Stripe account
    const { data: existingSeller, error: lookupError } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", email)
      .maybeSingle<DbSellerRow>();

    if (lookupError) {
      return NextResponse.json(
        { error: "Failed to check seller record", details: lookupError.message },
        { status: 500 }
      );
    }

    let stripeAccountId = existingSeller?.stripe_account_id || "";

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          seller_email: email,
        },
      });

      stripeAccountId = account.id;

      const { error: upsertError } = await supabase.from("sellers").upsert(
        {
          email,
          stripe_account_id: stripeAccountId,
          onboarding_complete: false,
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
        },
        { onConflict: "email" }
      );

      if (upsertError) {
        return NextResponse.json(
          { error: "Failed to save Stripe account in database", details: upsertError.message },
          { status: 500 }
        );
      }
    }

    const origin = getAppOrigin(request);
    const encodedEmail = encodeURIComponent(email);

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/seller/connect?refresh=true&email=${encodedEmail}`,
      return_url: `${origin}/seller/connect?success=true&account_id=${encodeURIComponent(stripeAccountId)}&email=${encodedEmail}`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId: stripeAccountId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to start Stripe onboarding",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
