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
      seat_limit: 25,
      storage_limit_mb: 100 * 1024,
    };
  }

  return {
    plan_tier: "free",
    seat_limit: 1,
    storage_limit_mb: 1024,
  };
}

async function findAccountByCustomerOrMetadata(input: {
  customerId?: string | null;
  subscription?: Stripe.Subscription | null;
  checkoutSession?: Stripe.Checkout.Session | null;
}) {
  const { customerId, subscription, checkoutSession } = input;

  if (customerId) {
    const { data: byCustomer, error: byCustomerError } = await supabase
      .from("accounts")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (byCustomerError) throw byCustomerError;
    if (byCustomer) return byCustomer;
  }

  const metadataUserId =
    subscription?.metadata?.supabase_user_id ||
    checkoutSession?.metadata?.supabase_user_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (metadataUserId) {
    const { data: byOwner, error: byOwnerError } = await supabase
      .from("accounts")
      .select("*")
      .eq("owner_id", metadataUserId)
      .maybeSingle();

    if (byOwnerError) throw byOwnerError;
    if (byOwner) return byOwner;
  }

  if (subscription?.id) {
    const { data: bySub, error: bySubError } = await supabase
      .from("accounts")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (bySubError) throw bySubError;
    if (bySub) return bySub;
  }

  return null;
}

async function applySubscriptionToAccount(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    throw new Error("Subscription missing customer ID.");
  }

  const priceId = subscription.items.data?.[0]?.price?.id || null;
  const plan = getPlanFromPriceId(priceId);

  const account = await findAccountByCustomerOrMetadata({
    customerId,
    subscription,
  });

  if (!account?.owner_id) {
    throw new Error("Could not find account for Stripe subscription.");
  }

  const status = subscription.status;

  const planStatus =
    status === "active" || status === "trialing"
      ? "active"
      : status === "past_due"
        ? "past_due"
        : status === "canceled" ||
            status === "unpaid" ||
            status === "incomplete_expired"
          ? "canceled"
          : status;

  const shouldHavePaidPlan =
    status === "active" || status === "trialing" || status === "past_due";

  const update = shouldHavePaidPlan
    ? {
        owner_id: account.owner_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        billing_source: "stripe",
        plan_status: planStatus,
        plan_tier: plan.plan_tier,
        seat_limit: plan.seat_limit,
        storage_limit_mb: plan.storage_limit_mb,
        updated_at: new Date().toISOString(),
      }
    : {
        owner_id: account.owner_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: null,
        stripe_price_id: null,
        billing_source: "none",
        plan_status: "canceled",
        plan_tier: "free",
        seat_limit: 1,
        storage_limit_mb: 1024,
        updated_at: new Date().toISOString(),
      };

  const { error } = await supabase
    .from("accounts")
    .upsert(update, { onConflict: "owner_id" });

  if (error) throw error;
}

async function applyCheckoutSessionToAccount(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (customerId) {
    const existing = await findAccountByCustomerOrMetadata({
      customerId,
      subscription,
      checkoutSession: session,
    });

    if (existing?.owner_id) {
      const { error } = await supabase
        .from("accounts")
        .upsert(
          {
            owner_id: existing.owner_id,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "owner_id" }
        );

      if (error) throw error;
    }
  }

  await applySubscriptionToAccount(subscription);
}

async function cancelAccountBySubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const account = await findAccountByCustomerOrMetadata({
    customerId,
    subscription,
  });

  if (!account?.owner_id) {
    throw new Error("Could not find account to cancel.");
  }

  const { error } = await supabase
    .from("accounts")
    .upsert(
      {
        owner_id: account.owner_id,
        stripe_customer_id: customerId || account.stripe_customer_id || null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        billing_source: "none",
        plan_status: "canceled",
        plan_tier: "free",
        seat_limit: 1,
        storage_limit_mb: 1024,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    );

  if (error) throw error;
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
      {
        error: `Webhook signature verification failed: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      },
      400
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription") {
          await applyCheckoutSessionToAccount(session);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await applySubscriptionToAccount(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await cancelAccountBySubscription(subscription);
        break;
      }

      default:
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error("stripe-webhook error", err);

    return json(
      {
        error: err instanceof Error ? err.message : "Unknown webhook error",
      },
      500
    );
  }
});