import { loadStripe } from "@stripe/stripe-js";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  throw new Error("Missing VITE_STRIPE_PUBLIC_KEY");
}

export const stripePromise = loadStripe(stripePublicKey);