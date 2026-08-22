// Vercel Edge Function — re-verifies an existing Stripe customer's
// subscription is still active. Called periodically from the client so a
// cancelled subscriber's stored customer id doesn't keep granting Pro
// access forever (the license is otherwise just a client-side flag with no
// expiry of its own).

/// <reference types="node" />

import Stripe from "stripe";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId || !customerId.startsWith("cus_")) {
    return new Response("Missing or invalid customerId", { status: 400 });
  }

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    return new Response(JSON.stringify({ active: subs.data.length > 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Stripe error: ${message}`, { status: 502 });
  }
}
