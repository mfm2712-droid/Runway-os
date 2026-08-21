// Vercel Edge Function — lets a Pro user restore access on a new device
// without us keeping a database. Stripe is the only source of truth: given
// an email, look up the Stripe customer and check for an active
// subscription. If found, return the customer id so the client can store it
// locally, exactly as if they'd just finished Checkout.
//
// Deliberately vague on failure ("no active subscription found") rather
// than distinguishing "no such customer" vs "customer exists but expired" —
// avoids leaking which emails have ever been customers.

/// <reference types="node" />

import Stripe from "stripe";

export const config = { runtime: "edge" };

interface RestoreBody {
  email: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  let body: RestoreBody;
  try {
    body = (await req.json()) as RestoreBody;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return new Response("Missing email", { status: 400 });
  }

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const customers = await stripe.customers.list({ email, limit: 10 });

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });
      if (subs.data.length > 0) {
        return new Response(JSON.stringify({ found: true, customerId: customer.id }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ found: false }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Stripe error: ${message}`, { status: 502 });
  }
}
