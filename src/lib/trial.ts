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

  const elapsedHours = (Date.now() - new Date(trialStartedAt).getTime()) / 3600000;
  const hoursLeft = TRIAL_HOURS - elapsedHours;
  if (hoursLeft > 0) return { kind: "trial", hoursLeft };
  return { kind: "expired" };
}

/**
 * Soft format check only (XXXX-XXXX-XXXX-XXXX) — there's no license server
 * to call, so any correctly-shaped key is accepted. Disclosed to the user
 * in the paywall UI, not presented as real verification.
 */
export function isValidLicenseFormat(key: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key.trim());
}
