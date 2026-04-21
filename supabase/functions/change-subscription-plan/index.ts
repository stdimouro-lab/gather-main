import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function getBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function getAllowedPriceIds() {
  return {
    plus: Deno.env.get("STRIPE_PRICE_PLUS") || "",
    family: Deno.env.get("STRIPE_PRICE_FAMILY") || "",
    business: Deno.env.get("STRIPE_PRICE_BUSINESS") || "",
  };
}

function getSeatLimitFromPriceId(priceId: string) {
  const plus = Deno.env.get("STRIPE_PRICE_PLUS");
  const family = Deno.env.get("STRIPE_PRICE_FAMILY");
  const business = Deno.env.get("STRIPE_PRICE_BUSINESS");

  if (priceId === plus) return 1;
  if (priceId === family) return 5;
  if (priceId === business) return 25;

  return 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
    }

    if (!supabaseUrl) {
      return json({ error: "Missing SUPABASE_URL" }, 500);
    }

    if (!supabaseServiceRoleKey) {
      return json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    const accessToken = getBearerToken(authHeader);

    if (!accessToken) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError) {
      return json({ error: `Auth error: ${userError.message}` }, 401);
    }

    if (!user) {
      return json({ error: "No authenticated user found." }, 401);
    }

    const body = await req.json().catch(() => null);
    const nextPriceId = body?.priceId;

    if (!nextPriceId) {
      return json({ error: "Missing priceId" }, 400);
    }

    const allowed = getAllowedPriceIds();
    const allowedValues = Object.values(allowed).filter(Boolean);

    if (!allowedValues.includes(nextPriceId)) {
      return json(
        {
          error: "That plan is not allowed.",
          receivedPriceId: nextPriceId,
          allowedPriceIds: allowed,
        },
        400
      );
    }

    const { data: account, error: accountError } = await supabaseAdmin
  .from("accounts")
  .select(
    "id, owner_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_source, plan_tier, plan_status, seats_used"
  )
  .eq("owner_id", user.id)
  .maybeSingle();

    if (accountError) {
      return json(
        { error: `Account lookup failed: ${accountError.message}` },
        500
      );
    }

    // 🚨 SEAT OVERFLOW PROTECTION (NEW)

const targetSeatLimit = getSeatLimitFromPriceId(nextPriceId);

if (
  typeof account?.seats_used === "number" &&
  account.seats_used > targetSeatLimit
) {
  return json(
    {
      error: `You currently have ${account.seats_used} members, but this plan only allows ${targetSeatLimit}. Remove members before downgrading.`,
      code: "seat_overflow",
    },
    400
  );
}

    if (!account?.stripe_customer_id || !account?.stripe_subscription_id) {
      return json(
        {
          error:
            "No Stripe subscription is connected to this account. Start checkout first.",
          code: "no_subscription",
        },
        400
      );
    }

    if (account.billing_source !== "stripe") {
      return json(
        {
          error:
            "Plan switching is only available for Stripe-managed subscriptions.",
          code: "not_stripe_billing",
        },
        400
      );
    }

    const subscription = await stripe.subscriptions.retrieve(
      account.stripe_subscription_id
    );

    if (!subscription || !subscription.items?.data?.length) {
      return json(
        { error: "Could not find the Stripe subscription items." },
        404
      );
    }

    const currentStripePriceId = subscription.items.data[0]?.price?.id || null;

    if (
      account.stripe_price_id === nextPriceId ||
      currentStripePriceId === nextPriceId
    ) {
      return json({
        success: true,
        changed: false,
        message: "Your subscription is already on that plan.",
      });
    }

    if (subscription.schedule) {
      return json(
        {
          error:
            "This subscription is schedule-managed. Update the schedule before changing the plan directly.",
          code: "subscription_schedule_attached",
        },
        409
      );
    }

    const subscriptionItem = subscription.items.data[0];

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: nextPriceId,
          },
        ],
        proration_behavior: "create_prorations",
        payment_behavior: "allow_incomplete",
        metadata: {
          ...(subscription.metadata ?? {}),
          supabase_user_id: user.id,
          account_owner_id: user.id,
        },
      }
    );

    return json({
      success: true,
      changed: true,
      subscriptionId: updatedSubscription.id,
      subscriptionStatus: updatedSubscription.status,
      currentPriceId: currentStripePriceId,
      nextPriceId,
      message: "Subscription updated. Account changes will sync by webhook.",
    });
  } catch (error) {
    console.error("change-subscription-plan error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});