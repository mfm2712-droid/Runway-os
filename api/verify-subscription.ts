// Vercel Edge Function — re-verifies an existing Stripe customer's
// subscription is still active. Called periodically from the client so a
// cancelled subscriber's stored customer id doesn't keep granting Pro
// access forever (the license is otherwise just a client-side flag with no
// expiry of its own).

/// <reference types="node" />

import Stripe from "stripe";
import { checkRateLimit, getClientIp } from "./_lib/rateLimit";

export const config = { runtime: "edge" };

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // per minute

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!checkRateLimit(getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS)) {
    return new Response("Too many requests — please slow down.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
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
