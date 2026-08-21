// Vercel Edge Function — Stripe webhook receiver.
//
// Known limitation: Runway OS has no database (state lives in the user's
// own localStorage by design — see src/hooks/useLocalStorage.ts). That
// means this handler can verify and log events, but it has nowhere durable
// to write "this customer's subscription is now active/cancelled" for
// later lookup. Cross-device restore is instead handled by
// restore-by-email.ts, which asks Stripe directly at restore time rather
// than relying on a cache this webhook would maintain.
//
// Configure the endpoint URL in the Stripe Dashboard (Developers → Webhooks)
// as https://<your-domain>/api/stripe-webhook, subscribed to at least
// checkout.session.completed. Set STRIPE_WEBHOOK_SECRET to the signing
// secret shown there.

/// <reference types="node" />

import Stripe from "stripe";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await req.text();
  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      console.log(`[stripe-webhook] ${event.type} (${event.id})`);
      break;
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
