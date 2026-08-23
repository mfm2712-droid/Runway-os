import type { FinanceState } from "../../types";
import { CURRENCY_LABELS } from "../../types";
import {
  dailySafeSpend,
  formatCurrency,
  runwayMonths,
  spentThisMonth,
  subscriptionsTotal,
  totalMonthlyOutflow,
  unusedSubscriptionsTotal,
} from "../calculations";

/**
 * Compact, numeric-first summary of the user's finances — sent as system
 * context to the AI advisor and receipt parser. Keep this small: it's sent
 * on every request.
 */
export function buildFinancialContext(state: FinanceState): string {
  const c = state.currency;
  const runway = runwayMonths(state);
  const recent = [...state.expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((e) => `${e.date} · ${e.category} · ${formatCurrency(e.amount, c)}`)
    .join("\n");

  const subs = state.subscriptions
    .map(
      (s) =>
        `${s.name} · ${formatCurrency(s.amount, c)}/mo · renews day ${s.renewsOn}${s.flaggedUnused ? " · FLAGGED UNUSED" : ""}`,
    )
    .join("\n");

  return `USER FINANCIAL SNAPSHOT (all figures in ${CURRENCY_LABELS[c]}, ${c})
Liquid cash: ${formatCurrency(state.cashBalance, c)}
Fixed monthly outflows (excl. subscriptions): ${formatCurrency(state.fixedMonthlyOutflows, c)}
Subscriptions total: ${formatCurrency(subscriptionsTotal(state), c)}/mo
Unused/flagged subscriptions: ${formatCurrency(unusedSubscriptionsTotal(state), c)}/mo
Total monthly burn: ${formatCurrency(totalMonthlyOutflow(state), c)}
Runway at zero income: ${Number.isFinite(runway) ? runway.toFixed(1) + " months" : "infinite"}
Daily safe spend right now: ${formatCurrency(dailySafeSpend(state), c)}
Spent so far this month: ${formatCurrency(spentThisMonth(state), c)}

Subscriptions:
${subs || "(none tracked)"}

Recent expenses (most recent first):
${recent || "(none logged)"}`;
}

export const ADVISOR_SYSTEM_PROMPT = `You are Money Copilot, the built-in financial advisor for Runway OS, a minimalist personal finance tool.
Rules:
- Base every answer strictly on the USER FINANCIAL SNAPSHOT provided. Never invent numbers.
- Be direct and concise (2-4 short sentences, or a tight bulleted list). No filler, no disclaimers about "consult a professional" unless the question is genuinely outside personal budgeting.
- Prefer concrete, specific recommendations over generic advice ("cancel Cloud Storage & Tools to save 29/mo" beats "review your subscriptions").
- Use the exact currency symbol and figures from the snapshot — never assume GBP or £, always match the snapshot's currency.
- You are not a licensed financial advisor and must not give investment, tax, or legal advice — redirect those questions.
- Write in plain text only. Do NOT use markdown: no **bold**, no *italic*, no # headers, no \`\`\` code fences, and never wrap words in asterisks for emphasis. If listing items, use a plain dash "-" or numbers "1." with no bold markup.`;
