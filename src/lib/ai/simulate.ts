import type { Currency, Expense, ExpenseCategory, FinanceState, Subscription } from "../../types";
import { CURRENCY_SYMBOLS } from "../../types";
import {
  dailySafeSpend,
  formatCurrency,
  runwayMonths,
  spentThisMonth,
  totalMonthlyOutflow,
  unusedSubscriptionsTotal,
} from "../calculations";

/**
 * Deterministic, math-backed responses used when no live AI backend is
 * configured (no ANTHROPIC_API_KEY, or the /api/chat request fails — e.g. in
 * local `vite dev`, which can't run Vercel serverless functions). Every
 * number here comes from the user's real state; only the phrasing is
 * templated. Never presented as "real AI" — callers should show a
 * "Simulated" badge alongside this.
 */
export function simulateAdvisorReply(prompt: string, state: FinanceState): string {
  const p = prompt.toLowerCase();
  const buffer = state.cashBalance - totalMonthlyOutflow(state) - spentThisMonth(state);
  const runway = runwayMonths(state);
  const unused = unusedSubscriptionsTotal(state);

  const afford = p.match(/afford.*?[£€$]?\s*(\d+(?:\.\d+)?)/) || p.match(/[£€$]\s*(\d+(?:\.\d+)?)/);
  if (afford) {
    const amount = Number(afford[1]);
    const after = buffer - amount;
    if (after >= 0) {
      return `Yes — you have ${formatCurrency(buffer, state.currency)} in discretionary buffer this month after fixed costs and what you've already spent. Spending ${formatCurrency(amount, state.currency)} leaves ${formatCurrency(after, state.currency)}, and your daily safe spend would still hold for the rest of the month.`;
    }
    return `Tight. Your buffer this month is ${formatCurrency(buffer, state.currency)}, and ${formatCurrency(amount, state.currency)} would put you ${formatCurrency(Math.abs(after), state.currency)} past it. If it's not urgent, waiting until next month — or freeing up the ${formatCurrency(unused, state.currency)}/mo sitting in unused subscriptions first — would clear the room.`;
  }

  if (p.includes("runway") || p.includes("extend")) {
    const targetRunway = runway + 2;
    const targetBurn = state.cashBalance / targetRunway;
    const gap = totalMonthlyOutflow(state) - targetBurn;
    const unusedCoversAll = unused >= gap;
    return `To go from ${runway.toFixed(1)} to ${(runway + 2).toFixed(1)} months of runway, you need to cut about ${formatCurrency(Math.max(0, gap), state.currency)}/mo from your burn. ${
      unusedCoversAll
        ? `Cancelling your flagged unused subscriptions (${formatCurrency(unused, state.currency)}/mo) covers that on its own.`
        : `Cancelling your flagged unused subscriptions gets you ${formatCurrency(unused, state.currency)}/mo of it — you'd need to trim roughly ${formatCurrency(Math.max(0, gap - unused), state.currency)}/mo more from fixed costs to close the rest.`
    }`;
  }

  if (p.includes("subscription") || p.includes("leak")) {
    const flagged = state.subscriptions.filter((s) => s.flaggedUnused);
    if (flagged.length === 0) {
      return `No subscriptions are flagged as unused right now. You're paying ${formatCurrency(
        state.subscriptions.reduce((s, x) => s + x.amount, 0),
        state.currency,
      )}/mo total across ${state.subscriptions.length} subscription${state.subscriptions.length === 1 ? "" : "s"} — worth a manual pass if any have gone quiet.`;
    }
    const list = flagged.map((s) => `${s.name} (${formatCurrency(s.amount, state.currency)}/mo)`).join(", ");
    return `${flagged.length} flagged as unused: ${list} — ${formatCurrency(unused, state.currency)}/mo combined, ${formatCurrency(unused * 12, state.currency)}/yr. Cancelling all of them adds roughly ${extraRunwayDays(state, unused)} days to your runway.`;
  }

  return `Running in simulated mode (no live AI connected) — but here's what your real numbers say: ${formatCurrency(
    dailySafeSpend(state),
    state.currency,
  )} safe to spend today, ${runway.toFixed(1)} months of runway, ${formatCurrency(unused, state.currency)}/mo in flagged subscriptions. Try one of the suggested questions above, or connect a live API key for open-ended answers — see ADS README AI setup.`;
}

export function extraRunwayDays(state: FinanceState, monthlySaving: number): number {
  const currentBurn = totalMonthlyOutflow(state);
  if (currentBurn <= 0 || monthlySaving <= 0) return 0;
  const currentRunway = state.cashBalance / currentBurn;
  const newBurn = Math.max(0.01, currentBurn - monthlySaving);
  const newRunway = state.cashBalance / newBurn;
  return Math.round((newRunway - currentRunway) * 30);
}

export function promptChips(currency: Currency): string[] {
  return [
    "Audit my subscriptions",
    `Can I afford ${CURRENCY_SYMBOLS[currency]}350 today?`,
    "How to add +2mo runway?",
  ];
}

const MERCHANT_CATEGORY: { pattern: RegExp; category: ExpenseCategory; merchant: string }[] = [
  { pattern: /uber|lyft|taxi|bolt/i, category: "transport", merchant: "Uber" },
  { pattern: /tesco|sainsbury|asda|whole ?foods|grocery/i, category: "food", merchant: "Tesco" },
  { pattern: /netflix|spotify|disney|prime video/i, category: "entertainment", merchant: "Netflix" },
  { pattern: /gym|fitness|peloton/i, category: "health", merchant: "PureGym" },
  { pattern: /rent|landlord|mortgage/i, category: "housing", merchant: "Landlord" },
  { pattern: /amazon|zara|asos|shop/i, category: "shopping", merchant: "Amazon" },
];

export interface ParsedReceipt {
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  recurring: boolean;
  date: string;
}

/**
 * Simulated vision/OCR parse. Uses the dropped file name or pasted text as a
 * weak signal (real merchant/category keywords still get picked up), and
 * otherwise produces a plausible one-off receipt so the flow is fully
 * demoable without a live vision model.
 */
export function simulateReceiptParse(input: string): ParsedReceipt {
  const match = MERCHANT_CATEGORY.find((m) => m.pattern.test(input));
  const amountMatch = input.match(/(\d+\.\d{2})/);
  const today = new Date();
  const off = today.getTimezoneOffset();
  const date = new Date(today.getTime() - off * 60000).toISOString().slice(0, 10);

  return {
    merchant: match?.merchant ?? guessMerchantFromFilename(input),
    amount: amountMatch ? Number(amountMatch[1]) : Number((Math.random() * 60 + 5).toFixed(2)),
    category: match?.category ?? "other",
    recurring: /subscription|monthly|renew/i.test(input),
    date,
  };
}

function guessMerchantFromFilename(input: string): string {
  const base = input.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (!base || /^receipt|^img|^photo|^scan/i.test(base)) return "Unknown Merchant";
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
}

export function parsedReceiptToExpense(r: ParsedReceipt): Omit<Expense, "id"> {
  return { amount: r.amount, category: r.category, date: r.date };
}

export function simulateNegotiationScript(sub: Subscription, currency: Currency): string {
  const target = formatCurrency(sub.amount * 0.65, currency);
  const current = formatCurrency(sub.amount, currency);
  return `CALL / CHAT SCRIPT — ${sub.name}

Opening:
"Hi, I've been a subscriber on the ${sub.name} plan at ${current}/month, and I'm reviewing my subscriptions before deciding whether to keep it. Is there a loyalty or retention rate you can offer?"

If they ask why:
"The price is the main thing — I'd like to stay, but only if it's closer to ${target}/month. What can you do?"

If they offer a discount:
"That works if it's for at least 3 months — can you confirm that in writing/email before I accept?"

If they offer nothing:
"Understood — in that case, please go ahead and cancel my subscription effective immediately, and send written confirmation."

Tips:
- Ask for the retention team specifically if the first rep can't discount.
- Most providers can approve 20-40% off for a limited period — don't accept the first "no".
- Get any offer in writing before hanging up or ending the chat.`;
}

export function simulateCancellationEmail(sub: Subscription, currency: Currency): string {
  const annual = formatCurrency(sub.amount * 12, currency);
  return `Subject: Cancel my subscription — ${sub.name}

Hi ${sub.name} team,

I'd like to cancel my subscription effective immediately. Please confirm the cancellation and stop any further billing to my account.

Plan: ${sub.name}
Amount: ${formatCurrency(sub.amount, currency)}/month (${annual}/year)

If a retention offer would meaningfully lower this price, I'm open to hearing it — otherwise please process the cancellation and send written confirmation to this email address.

Thanks,
[Your name]`;
}
