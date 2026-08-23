import type { Currency, Expense, ExpenseCategory, FinanceState, Subscription } from "../../types";
import { CURRENCY_SYMBOLS } from "../../types";
import type { Lang } from "../i18n/translations";
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
 * "Simulated" badge alongside this. Intent-matching checks both English and
 * Spanish keywords since the user's typed prompt may be in either language,
 * but the returned sentence always follows `lang`.
 */
export function simulateAdvisorReply(prompt: string, state: FinanceState, lang: Lang = "en"): string {
  const p = prompt.toLowerCase();
  const buffer = state.cashBalance - totalMonthlyOutflow(state) - spentThisMonth(state);
  const runway = runwayMonths(state);
  const unused = unusedSubscriptionsTotal(state);
  const es = lang === "es";

  const afford = p.match(/afford.*?[£€$]?\s*(\d+(?:\.\d+)?)/) || p.match(/permit.*?[£€$]?\s*(\d+(?:\.\d+)?)/) || p.match(/[£€$]\s*(\d+(?:\.\d+)?)/);
  if (afford) {
    const amount = Number(afford[1]);
    const after = buffer - amount;
    if (after >= 0) {
      return es
        ? `Sí — tienes ${formatCurrency(buffer, state.currency)} de colchón discrecional este mes tras los gastos fijos y lo que ya has gastado. Gastar ${formatCurrency(amount, state.currency)} te deja ${formatCurrency(after, state.currency)}, y tu gasto diario seguro seguiría aguantando el resto del mes.`
        : `Yes — you have ${formatCurrency(buffer, state.currency)} in discretionary buffer this month after fixed costs and what you've already spent. Spending ${formatCurrency(amount, state.currency)} leaves ${formatCurrency(after, state.currency)}, and your daily safe spend would still hold for the rest of the month.`;
    }
    return es
      ? `Ajustado. Tu colchón este mes es ${formatCurrency(buffer, state.currency)}, y ${formatCurrency(amount, state.currency)} te dejaría ${formatCurrency(Math.abs(after), state.currency)} por encima. Si no es urgente, esperar al próximo mes — o liberar antes los ${formatCurrency(unused, state.currency)}/mes de suscripciones sin usar — te daría margen.`
      : `Tight. Your buffer this month is ${formatCurrency(buffer, state.currency)}, and ${formatCurrency(amount, state.currency)} would put you ${formatCurrency(Math.abs(after), state.currency)} past it. If it's not urgent, waiting until next month — or freeing up the ${formatCurrency(unused, state.currency)}/mo sitting in unused subscriptions first — would clear the room.`;
  }

  if (p.includes("runway") || p.includes("extend") || p.includes("extender")) {
    const targetRunway = runway + 2;
    const targetBurn = state.cashBalance / targetRunway;
    const gap = totalMonthlyOutflow(state) - targetBurn;
    const unusedCoversAll = unused >= gap;
    return es
      ? `Para pasar de ${runway.toFixed(1)} a ${(runway + 2).toFixed(1)} meses de runway, necesitas recortar unos ${formatCurrency(Math.max(0, gap), state.currency)}/mes de tu gasto. ${
          unusedCoversAll
            ? `Cancelar tus suscripciones marcadas como sin usar (${formatCurrency(unused, state.currency)}/mes) cubre eso por sí solo.`
            : `Cancelar tus suscripciones marcadas como sin usar te da ${formatCurrency(unused, state.currency)}/mes de eso — necesitarías recortar unos ${formatCurrency(Math.max(0, gap - unused), state.currency)}/mes más de gastos fijos para cerrar el resto.`
        }`
      : `To go from ${runway.toFixed(1)} to ${(runway + 2).toFixed(1)} months of runway, you need to cut about ${formatCurrency(Math.max(0, gap), state.currency)}/mo from your burn. ${
          unusedCoversAll
            ? `Cancelling your flagged unused subscriptions (${formatCurrency(unused, state.currency)}/mo) covers that on its own.`
            : `Cancelling your flagged unused subscriptions gets you ${formatCurrency(unused, state.currency)}/mo of it — you'd need to trim roughly ${formatCurrency(Math.max(0, gap - unused), state.currency)}/mo more from fixed costs to close the rest.`
        }`;
  }

  if (p.includes("subscription") || p.includes("leak") || p.includes("suscripci") || p.includes("fuga")) {
    const flagged = state.subscriptions.filter((s) => s.flaggedUnused);
    if (flagged.length === 0) {
      return es
        ? `No hay suscripciones marcadas como sin usar ahora mismo. Pagas ${formatCurrency(
            state.subscriptions.reduce((s, x) => s + x.amount, 0),
            state.currency,
          )}/mes en total entre ${state.subscriptions.length} suscripción${state.subscriptions.length === 1 ? "" : "es"} — vale la pena una revisión manual por si alguna quedó en desuso.`
        : `No subscriptions are flagged as unused right now. You're paying ${formatCurrency(
            state.subscriptions.reduce((s, x) => s + x.amount, 0),
            state.currency,
          )}/mo total across ${state.subscriptions.length} subscription${state.subscriptions.length === 1 ? "" : "s"} — worth a manual pass if any have gone quiet.`;
    }
    const list = flagged.map((s) => `${s.name} (${formatCurrency(s.amount, state.currency)}/mo)`).join(", ");
    return es
      ? `${flagged.length} marcadas como sin usar: ${list} — ${formatCurrency(unused, state.currency)}/mes combinado, ${formatCurrency(unused * 12, state.currency)}/año. Cancelarlas todas añade aproximadamente ${extraRunwayDays(state, unused)} días a tu runway.`
      : `${flagged.length} flagged as unused: ${list} — ${formatCurrency(unused, state.currency)}/mo combined, ${formatCurrency(unused * 12, state.currency)}/yr. Cancelling all of them adds roughly ${extraRunwayDays(state, unused)} days to your runway.`;
  }

  return es
    ? `Modo simulado (sin IA en vivo conectada) — pero esto dicen tus números reales: ${formatCurrency(
        dailySafeSpend(state),
        state.currency,
      )} seguro para gastar hoy, ${runway.toFixed(1)} meses de runway, ${formatCurrency(unused, state.currency)}/mes en suscripciones marcadas. Prueba una de las preguntas sugeridas arriba, o conecta una clave de API en vivo para respuestas abiertas — ver el README de configuración de IA.`
    : `Running in simulated mode (no live AI connected) — but here's what your real numbers say: ${formatCurrency(
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

export function promptChips(currency: Currency, lang: Lang = "en"): string[] {
  if (lang === "es") {
    return [
      "Audita mis suscripciones",
      `¿Puedo permitirme ${CURRENCY_SYMBOLS[currency]}350 hoy?`,
      "¿Cómo añado +2 meses de runway?",
    ];
  }
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
  {
    pattern: /electric|gas bill|water|utility|utilities|broadband|internet bill|phone bill|british gas|thames water/i,
    category: "bills",
    merchant: "Utility Co",
  },
  { pattern: /amazon|zara|asos|shop/i, category: "shopping", merchant: "Amazon" },
];

/**
 * Canonical parsed-receipt shape, shared by the live vision endpoint
 * (api/parse-receipt.ts) and the text-paste heuristic below. `recurring` is
 * an app-internal addition beyond the wire schema — the UI needs it to
 * offer "track as subscription instead" — kept alongside, not in place of,
 * the canonical fields.
 */
export interface ParsedReceipt {
  merchant: string;
  amount: number;
  currency: Currency | null;
  date: string;
  taxAmount: number | null;
  category: ExpenseCategory;
  confidenceScore: number;
  lineItemsSummary: string | null;
  isReceipt: boolean;
  recurring: boolean;
}

/**
 * Deterministic keyword/regex heuristic for pasted receipt TEXT — this was
 * never real OCR (there's no image to read), so it's always labeled
 * "Simulated" in the UI and always reports a modest confidence score. This
 * is a separate, honestly-disclosed convenience path, distinct from the
 * live vision pipeline in api/parse-receipt.ts, which must never fall back
 * to fabricated data like this for an actual IMAGE (see client.ts).
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
    currency: null,
    date,
    taxAmount: null,
    category: match?.category ?? "other",
    confidenceScore: 0.4,
    lineItemsSummary: null,
    isReceipt: true,
    recurring: /subscription|monthly|renew/i.test(input),
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

export function simulateNegotiationScript(sub: Subscription, currency: Currency, lang: Lang = "en"): string {
  const target = formatCurrency(sub.amount * 0.65, currency);
  const current = formatCurrency(sub.amount, currency);

  if (lang === "es") {
    return `GUION DE LLAMADA / CHAT — ${sub.name}

Apertura:
"Hola, soy suscriptor del plan ${sub.name} a ${current}/mes, y estoy revisando mis suscripciones antes de decidir si lo mantengo. ¿Hay alguna tarifa de fidelidad o retención que puedan ofrecerme?"

Si preguntan por qué:
"El precio es lo principal — me gustaría quedarme, pero solo si se acerca a ${target}/mes. ¿Qué pueden ofrecerme?"

Si ofrecen un descuento:
"Eso funciona si es por al menos 3 meses — ¿pueden confirmarlo por escrito/email antes de que acepte?"

Si no ofrecen nada:
"Entendido — en ese caso, por favor cancelen mi suscripción con efecto inmediato, y envíen confirmación por escrito."

Consejos:
- Pide específicamente hablar con el equipo de retención si el primer agente no puede aplicar descuento.
- La mayoría de proveedores pueden aprobar un 20-40% de descuento por tiempo limitado — no aceptes el primer "no".
- Consigue cualquier oferta por escrito antes de colgar o terminar el chat.`;
  }

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

export function simulateCancellationEmail(sub: Subscription, currency: Currency, lang: Lang = "en"): string {
  const annual = formatCurrency(sub.amount * 12, currency);

  if (lang === "es") {
    return `Asunto: Cancelar mi suscripción — ${sub.name}

Hola equipo de ${sub.name},

Me gustaría cancelar mi suscripción con efecto inmediato. Por favor confirmen la cancelación y detengan cualquier cobro adicional a mi cuenta.

Plan: ${sub.name}
Importe: ${formatCurrency(sub.amount, currency)}/mes (${annual}/año)

Si hay una oferta de retención que baje el precio de forma significativa, estoy abierto a escucharla — de lo contrario, por favor procesen la cancelación y envíen confirmación por escrito a este correo.

Gracias,
[Tu nombre]`;
  }

  return `Subject: Cancel my subscription — ${sub.name}

Hi ${sub.name} team,

I'd like to cancel my subscription effective immediately. Please confirm the cancellation and stop any further billing to my account.

Plan: ${sub.name}
Amount: ${formatCurrency(sub.amount, currency)}/month (${annual}/year)

If a retention offer would meaningfully lower this price, I'm open to hearing it — otherwise please process the cancellation and send written confirmation to this email address.

Thanks,
[Your name]`;
}
