import type { FinanceState } from "../../types";
import {
  dailySafeSpend,
  daysUntilDayOfMonth,
  formatCurrency,
  totalMonthlyOutflow,
  unusedSubscriptionsTotal,
} from "../calculations";
import { extraRunwayDays } from "./simulate";

export interface Briefing {
  headline: string;
  detail: string;
}

export type BriefingMode = "safe-flow" | "bills-alert" | "goal-velocity";

export const BRIEFING_MODES: { value: BriefingMode; label: string }[] = [
  { value: "safe-flow", label: "🟢 Safe Flow" },
  { value: "bills-alert", label: "🟡 Bills" },
  { value: "goal-velocity", label: "🔵 Velocity" },
];

/**
 * Every number here is computed from real state — only the sentence
 * template is fixed. This runs client-side and needs no AI call, so it's
 * always "live" in the sense that the math is real; it just isn't
 * LLM-generated prose. Swap in a real /api/chat call for varied phrasing
 * once a backend key is configured (see AdvisorDrawer for that pattern).
 */
export function computeBriefing(state: FinanceState, mode: BriefingMode = "safe-flow"): Briefing {
  if (mode === "bills-alert") return computeBillsBriefing(state);
  if (mode === "goal-velocity") return computeVelocityBriefing(state);
  return computeSafeFlowBriefing(state);
}

function computeSafeFlowBriefing(state: FinanceState): Briefing {
  const safeSpend = dailySafeSpend(state);
  const unused = unusedSubscriptionsTotal(state);
  const flaggedCount = state.subscriptions.filter((s) => s.flaggedUnused).length;

  const headline = `You have ${formatCurrency(safeSpend, state.currency)} safe to spend today.`;

  if (flaggedCount === 0) {
    return {
      headline,
      detail: "No flagged subscriptions dragging on your runway right now — nicely trimmed.",
    };
  }

  const days = extraRunwayDays(state, unused);
  const plural = flaggedCount === 1 ? "sub" : `${flaggedCount} subs`;
  return {
    headline,
    detail: `Cancelling your flagged ${plural} (${formatCurrency(unused, state.currency)}/mo) adds +${days} day${days === 1 ? "" : "s"} to your runway.`,
  };
}

function computeBillsBriefing(state: FinanceState): Briefing {
  if (state.subscriptions.length === 0) {
    return {
      headline: "No recurring bills tracked yet.",
      detail: "Add a subscription to see upcoming renewals here.",
    };
  }

  const upcoming = state.subscriptions
    .map((s) => ({ sub: s, days: daysUntilDayOfMonth(s.renewsOn) }))
    .sort((a, b) => a.days - b.days);

  const soon = upcoming.filter((x) => x.days <= 7);
  const headline =
    soon.length > 0
      ? `${soon.length} bill${soon.length === 1 ? "" : "s"} due within a week.`
      : `Next bill: ${upcoming[0].sub.name} in ${upcoming[0].days} days.`;

  const detail = upcoming
    .slice(0, 3)
    .map((x) => `${x.sub.name} · ${formatCurrency(x.sub.amount, state.currency)} in ${x.days}d`)
    .join(" · ");

  return { headline, detail };
}

function computeVelocityBriefing(state: FinanceState): Briefing {
  const burn = totalMonthlyOutflow(state);
  const buffer = state.safetyBuffer || 0;
  const usable = state.cashBalance - buffer;

  if (burn <= 0) {
    return {
      headline: "No monthly burn tracked.",
      detail: "Add fixed costs or subscriptions to see your goal velocity.",
    };
  }

  if (usable <= 0) {
    return {
      headline: "Already at your safety buffer.",
      detail: `Burning ${formatCurrency(burn, state.currency)}/mo with no cushion left above your ${formatCurrency(buffer, state.currency)} buffer.`,
    };
  }

  const months = usable / burn;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.round(months));
  const dateLabel = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return {
    headline: `Burning ${formatCurrency(burn, state.currency)}/mo.`,
    detail: `At this pace, you'll reach your ${formatCurrency(buffer, state.currency)} safety buffer by ${dateLabel}.`,
  };
}
