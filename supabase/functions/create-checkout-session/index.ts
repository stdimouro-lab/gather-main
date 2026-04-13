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

const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: "Missing required env vars" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    // Auth client (user)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (DB writes)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized user" }, 401);
    }

    const body = await req.json().catch(() => null);

    const priceId = body?.priceId;
    const successUrl = body?.successUrl;
    const cancelUrl = body?.cancelUrl;

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: "Missing required parameters" }, 400);
    }

    // 🔍 Get account
    const { data: account } = await adminClient
      .from("accounts")
      .select("id, owner_id, stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    let stripeCustomerId = account?.stripe_customer_id ?? null;

    // 🧠 Create Stripe customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: updateError } = await adminClient
        .from("accounts")
        .upsert(
          {
            owner_id: user.id,
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "owner_id" }
        );

      if (updateError) {
        return json({ error: "Failed to save Stripe customer" }, 500);
      }
    }

    // 🚫 Prevent duplicate subscriptions
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 20,
    });

    const blockingSubscription = existingSubscriptions.data.find((sub) =>
      BLOCKED_SUBSCRIPTION_STATUSES.has(sub.status)
    );

    if (blockingSubscription) {
      return json(
        {
          error: "Already subscribed. Use Manage Billing.",
          code: "subscription_exists",
        },
        409
      );
    }

    // 🚀 Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: successUrl,
      cancel_url: cancelUrl,

      allow_promotion_codes: true,

      client_reference_id: user.id,

      metadata: {
        supabase_user_id: user.id,
      },

      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});