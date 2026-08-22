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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResult {
  isLive: boolean;
}

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
): Promise<StreamResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context: buildFinancialContext(state) }),
    });

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
      simulateAdvisorReply(messages[messages.length - 1]?.content ?? "", state),
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
export async function parseReceipt(input: { file?: File; text?: string }): Promise<ReceiptParseResult> {
  if (input.file) {
    let res: Response;
    try {
      const base64 = await fileToBase64(input.file);
      res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: input.file.type }),
      });
    } catch {
      throw new ReceiptParseError("unavailable", "Couldn't reach the receipt scanner — check your connection and try again.");
    }

    if (!res.ok) {
      throw new ReceiptParseError("unavailable", "Couldn't read that receipt right now — try again in a moment.");
    }

    const data = (await res.json()) as ParsedReceipt;
    if (!data.isReceipt) {
      throw new ReceiptParseError("not_a_receipt", "That doesn't look like a receipt — try a clearer photo, or enter it manually.");
    }
    return { ...data, isLive: true };
  }

  return { ...simulateReceiptParse(input.text ?? ""), isLive: false };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
): Promise<GeneratedEmailResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Write a short, polite, formal cancellation email for the "${sub.name}" subscription (${CURRENCY_SYMBOLS[state.currency]}${sub.amount.toFixed(2)}/month). Ask for written confirmation and that billing stop immediately. Output only the email, starting with a Subject line — no commentary.`,
          },
        ],
        context: buildFinancialContext(state),
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
    return { draft: simulateCancellationEmail(sub, state.currency), isLive: false };
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
): Promise<GeneratedEmailResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Write a short call/chat retention negotiation script for cancelling the "${sub.name}" subscription (currently ${CURRENCY_SYMBOLS[state.currency]}${sub.amount.toFixed(2)}/month). The goal is to ask the provider's retention team for a 30-40% discount before agreeing to cancel. Structure it as: an opening line, a response if they ask why, a response if they offer a discount, a response if they offer nothing, and 2-3 short tips. Output only the script, no commentary.`,
          },
        ],
        context: buildFinancialContext(state),
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
    return { draft: simulateNegotiationScript(sub, state.currency), isLive: false };
  }
}
