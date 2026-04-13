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

const ALLOWED_PRICE_IDS = new Set([
  "price_1TL9UIHJo7JMdji56xN4yebz", // plus
  "price_1TIhsVHJo7JMdji50jMxzlX6", // family_team
  "price_1TL9UcHJo7JMdji536Q7Z1tM", // business
]);

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
    }

    if (!supabaseUrl) {
      return json({ error: "Missing SUPABASE_URL" }, 500);
    }

    if (!supabaseAnonKey) {
      return json({ error: "Missing SUPABASE_ANON_KEY" }, 500);
    }

    if (!supabaseServiceRoleKey) {
      return json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
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
    } = await supabaseUser.auth.getUser();

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

    if (!ALLOWED_PRICE_IDS.has(nextPriceId)) {
      return json({ error: "That plan is not allowed." }, 400);
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select(
        "id, owner_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_source, plan_tier, plan_status"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (accountError) {
      return json(
        { error: `Account lookup failed: ${accountError.message}` },
        500
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

    if (account.stripe_price_id === nextPriceId) {
      return json({
        success: true,
        changed: false,
        message: "Your subscription is already on that plan.",
      });
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