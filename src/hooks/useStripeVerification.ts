import { useEffect, useState } from "react";

export type CheckoutBanner = "verifying" | "success" | "error" | null;

const REVERIFY_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Owns two Stripe-related side effects:
 * 1. On return from Checkout (?checkout=success&session_id=...), verifies
 *    the session server-side before activating Pro locally — a bare query
 *    param alone would be trivial to fake.
 * 2. Periodically re-verifies an existing Stripe-sourced licenseKey is
 *    still an active subscription, downgrading it locally if it's been
 *    cancelled — the client has no way to know that on its own otherwise,
 *    since a licenseKey never expires by itself.
 */
export function useStripeVerification(
  licenseKey: string | null,
  setLicenseKey: (key: string | null) => void,
): { checkoutBanner: CheckoutBanner } {
  const [checkoutBanner, setCheckoutBanner] = useState<CheckoutBanner>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("checkout") !== "success" || !sessionId) return;

    window.history.replaceState({}, "", window.location.pathname);
    setCheckoutBanner("verifying");

    fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data: { valid: boolean; customerId: string | null }) => {
        if (data.valid && data.customerId) {
          setLicenseKey(data.customerId);
          setCheckoutBanner("success");
          window.setTimeout(() => setCheckoutBanner(null), 6000);
        } else {
          setCheckoutBanner("error");
        }
      })
      .catch(() => setCheckoutBanner("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!licenseKey?.startsWith("cus_")) return;

    const reverify = () => {
      fetch(`/api/verify-subscription?customerId=${encodeURIComponent(licenseKey)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { active: boolean } | null) => {
          if (data && !data.active) setLicenseKey(null);
        })
        .catch(() => {
          // Network/API unavailable — don't downgrade on a failed check,
          // only on a confirmed "not active" response.
        });
    };

    reverify();
    const id = window.setInterval(reverify, REVERIFY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [licenseKey, setLicenseKey]);

  return { checkoutBanner };
}
