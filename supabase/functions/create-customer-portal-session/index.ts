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

    // User-scoped client for validating the signed-in user
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

    // Service-role client for account lookup
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
      console.error("Portal auth error:", userError);
      return json({ error: `Auth error: ${userError.message}` }, 401);
    }

    if (!user) {
      return json({ error: "No authenticated user found." }, 401);
    }

    const body = await req.json().catch(() => null);
    const returnUrl =
      body?.returnUrl || "http://localhost:5173/settings";

    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id, owner_id, stripe_customer_id, billing_source, plan_tier")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (accountError) {
      console.error("Portal account lookup error:", accountError);
      return json(
        { error: `Account lookup failed: ${accountError.message}` },
        500
      );
    }

    if (!account?.stripe_customer_id) {
      return json(
        { error: "No Stripe customer found for this account yet." },
        400
      );
    }

    if (account.billing_source !== "stripe") {
      return json(
        { error: "Billing portal is only available for Stripe-managed plans." },
        400
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: returnUrl,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("create-customer-portal-session error:", error);

    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});