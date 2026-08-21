export type Plan = "monthly" | "annual";

/** Starts a Stripe Checkout session and redirects the browser to it. */
export async function startCheckout(plan: Plan): Promise<void> {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    throw new Error(`Checkout failed to start (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  window.location.href = data.url;
}
