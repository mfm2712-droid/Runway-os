export const TRIAL_HOURS = 72;

export type TrialStatus =
  | { kind: "trial"; hoursLeft: number }
  | { kind: "expired" }
  | { kind: "pro" };

export type DevOverride = "trial" | "expired" | "pro" | null;

/**
 * Client-only trial/license gating — there is no server to verify any of
 * this against, so it's a soft gate (a motivated user can clear
 * localStorage or flip devOverride in devtools). That's disclosed in
 * Settings; this is standard for an indie, backend-less product and not
 * meant to be tamper-proof.
 */
export function computeTrialStatus(
  trialStartedAt: string,
  licenseKey: string | null,
  devOverride: DevOverride,
): TrialStatus {
  if (devOverride === "pro") return { kind: "pro" };
  if (devOverride === "trial") return { kind: "trial", hoursLeft: TRIAL_HOURS - 1 };
  if (devOverride === "expired") return { kind: "expired" };
  if (licenseKey) return { kind: "pro" };

  // Trial hasn't actually started yet (onboarding not completed and no demo
  // data loaded) — a fresh, full trial, not ticking down.
  if (!trialStartedAt) return { kind: "trial", hoursLeft: TRIAL_HOURS };

  const elapsedHours = (Date.now() - new Date(trialStartedAt).getTime()) / 3600000;
  const hoursLeft = TRIAL_HOURS - elapsedHours;
  if (hoursLeft > 0) return { kind: "trial", hoursLeft };
  return { kind: "expired" };
}

/**
 * Sentinel licenseKey value for hand-issued support access, verified
 * server-side against SUPPORT_ACCESS_TOKEN (see api/verify-support-token.ts)
 * rather than accepted as any correctly-shaped string. Distinct from a
 * Stripe customer id (`cus_...`) so billing-portal UI doesn't show for it.
 */
export const SUPPORT_ACCESS_LICENSE = "support:verified";
