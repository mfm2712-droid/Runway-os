// Vercel Edge Function — starts a Stripe Checkout session for the Monthly
// or Annual plan and returns the hosted checkout URL to redirect to.
//
// Setup: set STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, and STRIPE_PRICE_ANNUAL
// in your Vercel project's environment variables. Never commit real values —
// see .env.example. The Price IDs (price_...) are not secret; the secret
// key must never be exposed client-side.

import Stripe from "stripe";

export const config = { runtime: "edge" };

interface CheckoutBody {
  plan: "monthly" | "annual";
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  const priceIds: Record<CheckoutBody["plan"], string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANNUAL,
  };

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const priceId = priceIds[body.plan];
  if (!priceId) {
    return new Response(`No price configured for plan "${body.plan}"`, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Stripe error: ${message}`, { status: 502 });
  }
}
