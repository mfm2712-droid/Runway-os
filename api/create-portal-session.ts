// Vercel Edge Function — opens the Stripe-hosted Billing Portal for a known
// customer id, so Pro users can update payment method, switch plan, view
// invoices, or cancel entirely without us building any of that UI ourselves.

/// <reference types="node" />

import Stripe from "stripe";

export const config = { runtime: "edge" };

interface PortalBody {
  customerId: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response("Stripe is not configured", { status: 500 });
  }

  let body: PortalBody;
  try {
    body = (await req.json()) as PortalBody;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (!body.customerId) {
    return new Response("Missing customerId", { status: 400 });
  }

  const stripe = new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: body.customerId,
      return_url: `${origin}/app`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return new Response(`Stripe error: ${message}`, { status: 502 });
  }
}
