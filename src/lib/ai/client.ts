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

/**
 * Parses a receipt. Image files go to /api/parse-receipt (a real vision
 * model call — needs a live backend + key). Dropped/pasted text is parsed
 * with a lightweight local heuristic (no vision model needed for plain
 * text), which also serves as the fallback if the live image endpoint is
 * unavailable.
 */
export async function parseReceipt(input: { file?: File; text?: string }): Promise<ReceiptParseResult> {
  if (input.file) {
    try {
      const base64 = await fileToBase64(input.file);
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: input.file.type }),
      });
      if (!res.ok) throw new Error(`Receipt endpoint returned ${res.status}`);
      const data = (await res.json()) as ParsedReceipt;
      return { ...data, isLive: true };
    } catch {
      return { ...simulateReceiptParse(input.file.name), isLive: false };
    }
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
