// Vercel Edge Function — called when the user lands back on /app after
// Stripe Checkout (see success_url in create-checkout-session.ts). Confirms
// the session actually completed and paid before the client marks itself
// Pro, since a bare "?checkout=success" query param on its own would be
// trivial to fake by just typing it into the URL bar.
//
// There's no database here — this endpoint only tells the client "yes, this
// specific Stripe session_id really was paid, and here's the customer id."
// The client then stores that customer id locally and uses it going forward
// (e.g. to open the Billing Portal). Restoring on a second device works via
// restore-by-email (see restore-by-email.ts), not this endpoint.

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

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return new Response("Missing session_id", { status: 400 });
  }

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const valid = session.status === "complete" && session.payment_status === "paid";
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    return new Response(
      JSON.stringify({
        valid,
        customerId: valid ? customerId ?? null : null,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Stripe error: ${message}`, { status: 502 });
  }
}
