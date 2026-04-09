// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const PLAN_BY_PRICE_ID: Record<string, string> = {
  // replace these with your real Stripe price IDs
  "price_plus_monthly": "plus",
  "price_family_team_monthly": "family_team",
  "price_business_monthly": "business",
};

async function updateAccountFromSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceId = subscription.items.data[0]?.price?.id;
  const planTier = priceId ? PLAN_BY_PRICE_ID[priceId] ?? "free" : "free";

  const status = subscription.status;

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId ?? null,
    plan_tier:
      status === "active" || status === "trialing" ? planTier : "free",
    plan_status: status,
    billing_source: "stripe",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("accounts")
    .update(update)
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw error;
  }
}

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400 });
    }

    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.customer && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            String(session.subscription)
          );
          await updateAccountFromSubscription(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateAccountFromSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-webhook error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Webhook error",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});