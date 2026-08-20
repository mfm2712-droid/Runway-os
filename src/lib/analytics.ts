import { track as vercelTrack } from "@vercel/analytics";

/**
 * Thin, typed wrapper around @vercel/analytics — keeps every event name and
 * its payload shape in one place. Non-blocking: @vercel/analytics no-ops
 * outside a Vercel deployment (logs to console in dev), it never throws or
 * delays the UI.
 */
export type AnalyticsEvent =
  | { name: "trial_started" }
  | { name: "paywall_viewed"; trigger: "trial_expired" | "manual" }
  | { name: "checkout_clicked"; plan: "monthly" | "annual" }
  | { name: "simulation_scrubbed" };

export function track(event: AnalyticsEvent): void {
  const { name, ...rest } = event;
  vercelTrack(name, Object.keys(rest).length ? rest : undefined);
}
