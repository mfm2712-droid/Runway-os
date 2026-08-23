import type { FinanceState } from "../../types";
import type { Lang } from "../i18n/translations";
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

/**
 * Every number here is computed from real state — only the sentence
 * template is fixed. This runs client-side and needs no AI call, so it's
 * always "live" in the sense that the math is real; it just isn't
 * LLM-generated prose. Swap in a real /api/chat call for varied phrasing
 * once a backend key is configured (see AdvisorDrawer for that pattern).
 */
export function computeBriefing(
  state: FinanceState,
  mode: BriefingMode = "safe-flow",
  lang: Lang = "en",
): Briefing {
  if (mode === "bills-alert") return computeBillsBriefing(state, lang);
  if (mode === "goal-velocity") return computeVelocityBriefing(state, lang);
  return computeSafeFlowBriefing(state, lang);
}

function computeSafeFlowBriefing(state: FinanceState, lang: Lang): Briefing {
  const safeSpend = dailySafeSpend(state);
  const unused = unusedSubscriptionsTotal(state);
  const flaggedCount = state.subscriptions.filter((s) => s.flaggedUnused).length;
  const es = lang === "es";

  const headline = es
    ? `Tienes ${formatCurrency(safeSpend, state.currency)} seguro para gastar hoy.`
    : `You have ${formatCurrency(safeSpend, state.currency)} safe to spend today.`;

  if (flaggedCount === 0) {
    return {
      headline,
      detail: es
        ? "No hay suscripciones marcadas arrastrando tu runway ahora mismo — bien recortado."
        : "No flagged subscriptions dragging on your runway right now — nicely trimmed.",
    };
  }

  const days = extraRunwayDays(state, unused);
  if (es) {
    const plural = flaggedCount === 1 ? "1 suscripción" : `${flaggedCount} suscripciones`;
    return {
      headline,
      detail: `Cancelar tu${flaggedCount === 1 ? "" : "s"} ${plural} marcada${flaggedCount === 1 ? "" : "s"} (${formatCurrency(unused, state.currency)}/mes) añade +${days} día${days === 1 ? "" : "s"} a tu runway.`,
    };
  }
  const plural = flaggedCount === 1 ? "sub" : `${flaggedCount} subs`;
  return {
    headline,
    detail: `Cancelling your flagged ${plural} (${formatCurrency(unused, state.currency)}/mo) adds +${days} day${days === 1 ? "" : "s"} to your runway.`,
  };
}

function computeBillsBriefing(state: FinanceState, lang: Lang): Briefing {
  const es = lang === "es";
  if (state.subscriptions.length === 0) {
    return {
      headline: es ? "Aún no hay facturas recurrentes registradas." : "No recurring bills tracked yet.",
      detail: es
        ? "Añade una suscripción para ver aquí las próximas renovaciones."
        : "Add a subscription to see upcoming renewals here.",
    };
  }

  const upcoming = state.subscriptions
    .map((s) => ({ sub: s, days: daysUntilDayOfMonth(s.renewsOn) }))
    .sort((a, b) => a.days - b.days);

  const soon = upcoming.filter((x) => x.days <= 7);
  const headline = es
    ? soon.length > 0
      ? `${soon.length} factura${soon.length === 1 ? "" : "s"} vence${soon.length === 1 ? "" : "n"} esta semana.`
      : `Próxima factura: ${upcoming[0].sub.name} en ${upcoming[0].days} días.`
    : soon.length > 0
    ? `${soon.length} bill${soon.length === 1 ? "" : "s"} due within a week.`
    : `Next bill: ${upcoming[0].sub.name} in ${upcoming[0].days} days.`;

  const detail = upcoming
    .slice(0, 3)
    .map((x) =>
      es
        ? `${x.sub.name} · ${formatCurrency(x.sub.amount, state.currency)} en ${x.days}d`
        : `${x.sub.name} · ${formatCurrency(x.sub.amount, state.currency)} in ${x.days}d`,
    )
    .join(" · ");

  return { headline, detail };
}

function computeVelocityBriefing(state: FinanceState, lang: Lang): Briefing {
  const burn = totalMonthlyOutflow(state);
  const buffer = state.safetyBuffer || 0;
  const usable = state.cashBalance - buffer;
  const es = lang === "es";

  if (burn <= 0) {
    return {
      headline: es ? "No hay gasto mensual registrado." : "No monthly burn tracked.",
      detail: es
        ? "Añade costos fijos o suscripciones para ver tu velocidad hacia el objetivo."
        : "Add fixed costs or subscriptions to see your goal velocity.",
    };
  }

  if (usable <= 0) {
    return {
      headline: es ? "Ya estás en tu colchón de seguridad." : "Already at your safety buffer.",
      detail: es
        ? `Gastando ${formatCurrency(burn, state.currency)}/mes sin margen por encima de tu colchón de ${formatCurrency(buffer, state.currency)}.`
        : `Burning ${formatCurrency(burn, state.currency)}/mo with no cushion left above your ${formatCurrency(buffer, state.currency)} buffer.`,
    };
  }

  const months = usable / burn;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.round(months));
  const dateLabel = d.toLocaleDateString(es ? "es-ES" : "en-GB", { month: "short", year: "numeric" });

  return {
    headline: es
      ? `Gastando ${formatCurrency(burn, state.currency)}/mes.`
      : `Burning ${formatCurrency(burn, state.currency)}/mo.`,
    detail: es
      ? `A este ritmo, alcanzarás tu colchón de seguridad de ${formatCurrency(buffer, state.currency)} en ${dateLabel}.`
      : `At this pace, you'll reach your ${formatCurrency(buffer, state.currency)} safety buffer by ${dateLabel}.`,
  };
}
