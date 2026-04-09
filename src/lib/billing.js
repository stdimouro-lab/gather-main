// src/lib/billing.js
import { stripePromise } from "./stripe";
import { supabase } from "./supabase";

export async function startCheckout(priceId) {
  console.log("startCheckout called with:", priceId);

  if (!priceId) {
    throw new Error("Missing Stripe price id.");
  }

  try {
    console.log("checking logged in user...");
    const { data: userData, error: userError } = await supabase.auth.getUser();

    console.log("billing user:", userData?.user?.email);
    console.log("billing user id:", userData?.user?.id);
    console.log("billing auth error:", userError);

    if (userError) {
      throw new Error(
        userError.message || "Could not validate your login session."
      );
    }

    if (!userData?.user?.id) {
      throw new Error("You must be logged in before upgrading.");
    }

    const payload = {
      priceId,
      successUrl: `${window.location.origin}/settings?billing=success`,
      cancelUrl: `${window.location.origin}/settings?billing=cancelled`,
    };

    console.log("invoking create-checkout-session with payload:", payload);

    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: payload,
      }
    );

    console.log("checkout invoke data:", data);
    console.log("checkout invoke error:", error);

    if (error) {
      throw new Error(error.message || "Checkout failed.");
    }

    if (!data) {
      throw new Error("Checkout function returned no data.");
    }

    if (!data.url && !data.sessionId) {
      throw new Error(
        "Checkout session was created, but neither url nor sessionId was returned."
      );
    }

    console.log("loading stripePromise...");
    const stripe = await stripePromise;
    console.log("stripe loaded:", !!stripe);

    if (stripe && data.sessionId) {
      console.log("redirecting with Stripe sessionId:", data.sessionId);

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      console.log("stripe redirect error:", stripeError);

      if (stripeError) {
        throw new Error(
          stripeError.message || "Stripe redirect failed."
        );
      }

      return;
    }

    if (data.url) {
      console.log("redirecting with checkout url:", data.url);
      window.location.href = data.url;
      return;
    }

    throw new Error("Checkout could not redirect.");
  } catch (err) {
    console.error("startCheckout fatal error:", err);
    throw err;
  }
}