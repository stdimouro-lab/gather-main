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
    const allowReset = Deno.env.get("ALLOW_TEST_BILLING_RESET");
    const allowedUserIdsRaw = Deno.env.get("TEST_BILLING_RESET_USER_IDS") ?? "";

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

    if (allowReset !== "true") {
      return json({ error: "Test billing reset is disabled." }, 403);
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

    const allowedUserIds = allowedUserIdsRaw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (allowedUserIds.length > 0 && !allowedUserIds.includes(user.id)) {
      return json({ error: "You are not allowed to reset test billing." }, 403);
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select(
        "id, owner_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_tier, plan_status, billing_source"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (accountError) {
      return json(
        { error: `Account lookup failed: ${accountError.message}` },
        500
      );
    }

    let canceledCount = 0;

    if (account?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: account.stripe_customer_id,
        status: "all",
        limit: 100,
      });

      for (const sub of subs.data) {
        if (sub.status !== "canceled") {
          await stripe.subscriptions.cancel(sub.id);
          canceledCount += 1;
        }
      }
    }

    const { error: resetError } = await supabaseAdmin
      .from("accounts")
      .update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        plan_tier: "free",
        plan_status: "canceled",
        billing_source: "none",
        is_comped: false,
        seat_limit: 1,
        storage_limit_mb: 2048,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id);

    if (resetError) {
      return json(
        { error: `Account reset failed: ${resetError.message}` },
        500
      );
    }

    return json({
      success: true,
      canceledSubscriptions: canceledCount,
      message: "Test billing reset complete.",
    });
  } catch (error) {
    console.error("reset-test-billing error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});