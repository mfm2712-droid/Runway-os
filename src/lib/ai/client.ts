import type { FinanceState, Subscription } from "../../types";
import { CURRENCY_SYMBOLS } from "../../types";
import { buildFinancialContext } from "./context";
import type { ParsedReceipt } from "./simulate";
import {
  simulateAdvisorReply,
  simulateCancellationEmail,
  simulateNegotiationScript,
  simulateReceiptParse,
} from "./simulate";
import { optimizeReceiptImage } from "../receiptOptimizer";
import type { Lang } from "../i18n/translations";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResult {
  isLive: boolean;
  /** True when the server's rate limit was hit — a distinct, honest state
   * from the generic simulated fallback (nothing was generated at all). */
  rateLimited?: boolean;
}

const RATE_LIMIT_MESSAGES: Record<Lang, string> = {
  en: "High demand — try again in a minute.",
  es: "Mucha demanda — inténtalo de nuevo en un minuto.",
};

/**
 * Streams an advisor reply, calling onChunk with the accumulated text so
 * far. Tries the live /api/chat serverless endpoint first (see api/chat.ts
 * — needs ANTHROPIC_API_KEY set on the deployment); if that's unavailable
 * (no backend running, e.g. plain `vite dev`, or no key configured, or a
 * network error) it transparently falls back to a deterministic,
 * math-backed simulated reply, revealed with the same chunk-by-chunk
 * cadence so the UI doesn't need to know which mode it's in — callers
 * should still show the `isLive` flag to the user for honesty.
 */
export async function streamAdvisorReply(
  messages: ChatMessage[],
  state: FinanceState,
  onChunk: (textSoFar: string) => void,
  lang: Lang = "en",
): Promise<StreamResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context: buildFinancialContext(state), lang }),
    });

    if (res.status === 429) {
      await simulateStream(RATE_LIMIT_MESSAGES[lang], onChunk);
      return { isLive: false, rateLimited: true };
    }

    if (!res.ok || !res.body) throw new Error(`AI endpoint returned ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    let received = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        received = true;
        acc += chunk;
        onChunk(acc);
      }
    }

    if (!received) throw new Error("Empty AI response");
    return { isLive: true };
  } catch {
    await simulateStream(
      simulateAdvisorReply(messages[messages.length - 1]?.content ?? "", state, lang),
      onChunk,
    );
    return { isLive: false };
  }
}

function simulateStream(fullText: string, onChunk: (textSoFar: string) => void): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      i += Math.random() < 0.15 ? 1 : 3;
      onChunk(fullText.slice(0, i));
      if (i >= fullText.length) {
        resolve();
        return;
      }
      window.setTimeout(step, 12 + Math.random() * 18);
    };
    step();
  });
}

export interface ReceiptParseResult extends ParsedReceipt {
  isLive: boolean;
}

export type ReceiptParseErrorReason = "not_a_receipt" | "unavailable";

/**
 * Thrown by parseReceipt() for an image that couldn't be read — never
 * silently replaced with a fabricated result. `reason` distinguishes "the
 * photo isn't a receipt at all" (a real, confident model answer) from
 * "the vision pipeline itself failed" (network, missing key, bad response),
 * so the UI can word the two differently.
 */
export class ReceiptParseError extends Error {
  reason: ReceiptParseErrorReason;
  constructor(reason: ReceiptParseErrorReason, message: string) {
    super(message);
    this.name = "ReceiptParseError";
    this.reason = reason;
  }
}

/**
 * Parses a receipt. Image files go to /api/parse-receipt (a real vision
 * model call — needs a live backend + key) and NEVER fall back to a
 * fabricated result: any failure throws ReceiptParseError. Dropped/pasted
 * text has no image to read in the first place, so it always uses a
 * lightweight local heuristic, honestly labeled as simulated.
 */
const RECEIPT_ERROR_MESSAGES: Record<Lang, { unreachable: string; failed: string; notAReceipt: string }> = {
  en: {
    unreachable: "Couldn't reach the receipt scanner — check your connection and try again.",
    failed: "Couldn't read that receipt right now — try again in a moment.",
    notAReceipt: "That doesn't look like a receipt — try a clearer photo, or enter it manually.",
  },
  es: {
    unreachable: "No se pudo contactar con el escáner de recibos — comprueba tu conexión e inténtalo de nuevo.",
    failed: "No se pudo leer ese recibo ahora mismo — inténtalo de nuevo en un momento.",
    notAReceipt: "Eso no parece un recibo — prueba con una foto más clara, o introdúcelo manualmente.",
  },
};

export async function parseReceipt(
  input: { file?: File; text?: string },
  lang: Lang = "en",
): Promise<ReceiptParseResult> {
  const messages = RECEIPT_ERROR_MESSAGES[lang];
  if (input.file) {
    let res: Response;
    try {
      const optimized = await optimizeReceiptImage(input.file);
      res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: optimized.base64, mimeType: optimized.mimeType }),
      });
    } catch {
      throw new ReceiptParseError("unavailable", messages.unreachable);
    }

    if (res.status === 429) {
      throw new ReceiptParseError("unavailable", RATE_LIMIT_MESSAGES[lang]);
    }

    if (!res.ok) {
      throw new ReceiptParseError("unavailable", messages.failed);
    }

    const data = (await res.json()) as ParsedReceipt;
    if (!data.isReceipt) {
      throw new ReceiptParseError("not_a_receipt", messages.notAReceipt);
    }
    return { ...data, isLive: true };
  }

  return { ...simulateReceiptParse(input.text ?? ""), isLive: false };
}

export interface GeneratedEmailResult {
  draft: string;
  isLive: boolean;
}

/**
 * Generates a cancellation email draft for a flagged subscription. Reuses
 * the /api/chat endpoint as a one-shot (non-streamed) call rather than
 * standing up a dedicated endpoint. Falls back to a solid deterministic
 * template — see simulateCancellationEmail — when no live backend is
 * configured.
 */
export async function generateCancellationEmail(
  sub: Subscription,
  state: FinanceState,
  lang: Lang = "en",
): Promise<GeneratedEmailResult> {
  try {
    const langInstruction = lang === "es" ? " Write it in Spanish." : "";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Write a short, polite, formal cancellation email for the "${sub.name}" subscription (${CURRENCY_SYMBOLS[state.currency]}${sub.amount.toFixed(2)}/month). Ask for written confirmation and that billing stop immediately. Output only the email, starting with a Subject line — no commentary.${langInstruction}`,
          },
        ],
        context: buildFinancialContext(state),
        lang,
      }),
    });

    if (!res.ok || !res.body) throw new Error(`AI endpoint returned ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let draft = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      draft += decoder.decode(value, { stream: true });
    }
    if (!draft.trim()) throw new Error("Empty AI response");
    return { draft, isLive: true };
  } catch {
    return { draft: simulateCancellationEmail(sub, state.currency, lang), isLive: false };
  }
}

/**
 * Generates a retention negotiation script for a call or chat with the
 * provider — asking for a discount before resorting to cancelling outright.
 * Same live/fallback pattern as generateCancellationEmail.
 */
export async function generateNegotiationScript(
  sub: Subscription,
  state: FinanceState,
  lang: Lang = "en",
): Promise<GeneratedEmailResult> {
  try {
    const langInstruction = lang === "es" ? " Write it in Spanish." : "";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Write a short call/chat retention negotiation script for cancelling the "${sub.name}" subscription (currently ${CURRENCY_SYMBOLS[state.currency]}${sub.amount.toFixed(2)}/month). The goal is to ask the provider's retention team for a 30-40% discount before agreeing to cancel. Structure it as: an opening line, a response if they ask why, a response if they offer a discount, a response if they offer nothing, and 2-3 short tips. Output only the script, no commentary.${langInstruction}`,
          },
        ],
        context: buildFinancialContext(state),
        lang,
      }),
    });

    if (!res.ok || !res.body) throw new Error(`AI endpoint returned ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let draft = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      draft += decoder.decode(value, { stream: true });
    }
    if (!draft.trim()) throw new Error("Empty AI response");
    return { draft, isLive: true };
  } catch {
    return { draft: simulateNegotiationScript(sub, state.currency, lang), isLive: false };
  }
}
