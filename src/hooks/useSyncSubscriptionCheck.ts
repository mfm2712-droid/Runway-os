import { useEffect } from "react";
import { verifySubscriptionCached } from "../lib/subscriptionCache";

/**
 * Re-verifies a Stripe-sourced license the moment a modal that cares about
 * plan status opens, rather than waiting for the next periodic background
 * poll (see useStripeVerification) — so a subscriber who cancelled
 * elsewhere sees it reflected immediately instead of up to hours later.
 * verifySubscriptionCached caches short-term so opening/closing the same
 * modal repeatedly doesn't re-hit the API every time.
 */
export function useSyncSubscriptionCheck(
  open: boolean,
  licenseKey: string | null | undefined,
  onInvalid: () => void,
): void {
  useEffect(() => {
    if (!open || !licenseKey?.startsWith("cus_")) return;
    let cancelled = false;
    verifySubscriptionCached(licenseKey).then((active) => {
      if (!cancelled && active === false) onInvalid();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, licenseKey]);
}
