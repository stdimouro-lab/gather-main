import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-04-10",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getPlanFromPriceId(priceId: string | null) {
  const plus = Deno.env.get("STRIPE_PRICE_PLUS") || "";
  const family = Deno.env.get("STRIPE_PRICE_FAMILY") || "";
  const business = Deno.env.get("STRIPE_PRICE_BUSINESS") || "";

  if (priceId === plus) {
    return {
      plan_tier: "plus",
      seat_limit: 1,
      storage_limit_mb: 5 * 1024,
    };
  }

  if (priceId === family) {
    return {
      plan_tier: "family_team",
      seat_limit: 5,
      storage_limit_mb: 25 * 1024,
    };
  }

  if (priceId === business) {
    return {
      plan_tier: "business",
      seat_limit: 15,
      storage_limit_mb: 100 * 1024,
    };
  }

  return {
    plan_tier: "free",
    seat_limit: 1,
    storage_limit_mb: 1024,
  };
}

async function upsertAccountBillingFromSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error("Subscription missing customer ID.");
  }

  const priceId =
    subscription.items.data?.[0]?.price?.id ||
    null;

  const plan = getPlanFromPriceId(priceId);

  const status = subscription.status;

  const planStatus =
    status === "active" || status === "trialing"
      ? "active"
      : status === "past_due"
        ? "past_due"
        : status === "canceled" || status === "unpaid" || status === "incomplete_expired"
          ? "canceled"
          : status;

  const paid =
    status === "active" || status === "trialing" || status === "past_due";

  const update = paid
    ? {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        billing_source: "stripe",
        plan_status: planStatus,
        plan_tier: plan.plan_tier,
        seat_limit: plan.seat_limit,
        storage_limit_mb: plan.storage_limit_mb,
      }
    : {
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
        billing_source: "none",
        plan_status: "canceled",
        plan_tier: "free",
        seat_limit: 1,
        storage_limit_mb: 1024,
      };

  const { error } = await supabase
    .from("accounts")
    .update(update)
    .eq("stripe_customer_id", customerId);

  if (!error) return;

  const { data: accountBySub, error: findBySubError } = await supabase
    .from("accounts")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (findBySubError) {
    throw findBySubError;
  }

  if (!accountBySub?.id) {
    throw error;
  }

  const { error: fallbackError } = await supabase
    .from("accounts")
    .update(update)
    .eq("id", accountBySub.id);

  if (fallbackError) {
    throw fallbackError;
  }
}

async function cancelAccountBillingByCustomerId(customerId: string) {
  const { error } = await supabase
    .from("accounts")
    .update({
      billing_source: "none",
      plan_status: "canceled",
      plan_tier: "free",
      stripe_subscription_id: null,
      seat_limit: 1,
      storage_limit_mb: 1024,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    return json(
      { error: `Webhook signature verification failed: ${err.message}` },
      400
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") {
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertAccountBillingFromSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertAccountBillingFromSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (customerId) {
          await cancelAccountBillingByCustomerId(customerId);
        }
        break;
      }

      default:
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error("stripe-webhook error", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown webhook error" },
      500
    );
  }
});