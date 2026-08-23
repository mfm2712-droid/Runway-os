// Vercel Edge Function — parses a receipt image via Anthropic's vision
// capability. Same setup as api/chat.ts: requires ANTHROPIC_API_KEY.
//
// Unlike api/chat.ts, this path has NO simulated fallback for image input —
// see src/lib/ai/client.ts. A vision OCR result that's wrong or missing is
// worse than one that's honestly absent, so any failure here (network,
// missing key, unparseable model output) must surface as a real error to
// the caller, never a fabricated receipt.

/// <reference types="node" />

import { checkRateLimit, getClientIp } from "./_lib/rateLimit";

export const config = { runtime: "edge" };

const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000; // per minute

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5MB

const CATEGORIES = ["food", "transport", "housing", "shopping", "health", "entertainment", "other"] as const;
type Category = (typeof CATEGORIES)[number];

const EXTRACT_PROMPT = `Look at this image and extract receipt data. Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "isReceipt": boolean (false if this image is not a receipt, invoice, or proof of purchase at all),
  "merchant": string,
  "amount": number (total amount paid, no currency symbol),
  "currency": string or null (ISO 4217 3-letter code, e.g. "GBP", "USD", "EUR" — null if not visible or unclear),
  "date": string (YYYY-MM-DD, use today's date if not visible on the receipt),
  "taxAmount": number or null (VAT/sales tax line, null if not itemized separately),
  "category": one of "food" | "transport" | "housing" | "shopping" | "health" | "entertainment" | "other",
  "confidenceScore": number from 0 to 1 (your confidence that merchant + amount are correctly read),
  "lineItemsSummary": string or null (a short one-line summary of what was purchased, e.g. "2x Coffee, 1x Sandwich" — null if not legible or not itemized),
  "recurring": boolean (true only if this clearly looks like a subscription/recurring charge, not a one-off purchase)
}
If isReceipt is false, still fill amount as 0 and category as "other" — the caller ignores those fields in that case.`;

interface ReceiptBody {
  imageBase64: string;
  mimeType: string;
}

interface RawModelResponse {
  isReceipt?: unknown;
  merchant?: unknown;
  amount?: unknown;
  currency?: unknown;
  date?: unknown;
  taxAmount?: unknown;
  category?: unknown;
  confidenceScore?: unknown;
  lineItemsSummary?: unknown;
  recurring?: unknown;
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates and clamps the model's raw JSON into the canonical shape the
 * client trusts. Returns null if the response is too malformed to use at
 * all (missing isReceipt, or a receipt with a non-finite amount) — the
 * caller treats that as a hard failure, not a fabricated zero-value result.
 */
function sanitize(raw: RawModelResponse): {
  isReceipt: boolean;
  merchant: string;
  amount: number;
  currency: string | null;
  date: string;
  taxAmount: number | null;
  category: Category;
  confidenceScore: number;
  lineItemsSummary: string | null;
  recurring: boolean;
} | null {
  if (typeof raw.isReceipt !== "boolean") return null;

  if (!raw.isReceipt) {
    return {
      isReceipt: false,
      merchant: "",
      amount: 0,
      currency: null,
      date: todayISO(),
      taxAmount: null,
      category: "other",
      confidenceScore: typeof raw.confidenceScore === "number" ? clamp01(raw.confidenceScore) : 0,
      lineItemsSummary: null,
      recurring: false,
    };
  }

  const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount);
  if (!Number.isFinite(amount)) return null;

  const currency =
    typeof raw.currency === "string" && /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : null;
  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO();
  const taxAmount =
    typeof raw.taxAmount === "number" && Number.isFinite(raw.taxAmount) ? raw.taxAmount : null;

  return {
    isReceipt: true,
    merchant: typeof raw.merchant === "string" && raw.merchant.trim() ? raw.merchant.trim().slice(0, 60) : "Unknown Merchant",
    amount,
    currency,
    date,
    taxAmount,
    category: isCategory(raw.category) ? raw.category : "other",
    confidenceScore: typeof raw.confidenceScore === "number" ? clamp01(raw.confidenceScore) : 0.5,
    lineItemsSummary:
      typeof raw.lineItemsSummary === "string" && raw.lineItemsSummary.trim()
        ? raw.lineItemsSummary.trim().slice(0, 200)
        : null,
    recurring: raw.recurring === true,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!checkRateLimit(getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS)) {
    return new Response("Too many requests — please slow down.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("AI backend not configured", { status: 500 });
  }

  const body = (await req.json()) as ReceiptBody;
  if (!body.imageBase64) {
    return new Response("Missing imageBase64", { status: 400 });
  }

  const mimeType = body.mimeType || "image/jpeg";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return new Response("Unsupported image type — use JPEG, PNG, or WebP.", { status: 415 });
  }

  // Base64 encodes 3 bytes as 4 chars, so decoded size ≈ length * 0.75 —
  // close enough for a size guard without actually decoding the payload.
  const approxBytes = body.imageBase64.length * 0.75;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return new Response("Image too large — please use a photo under 4.5MB.", { status: 413 });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 400,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: body.imageBase64,
              },
            },
            { type: "text", text: EXTRACT_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!upstream.ok) {
    return new Response(`Upstream AI error: ${upstream.status}`, { status: 502 });
  }

  const data = await upstream.json();
  const text: string = data.content?.[0]?.text ?? "";

  let raw: RawModelResponse;
  try {
    raw = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return new Response("Could not parse AI response", { status: 502 });
  }

  const sanitized = sanitize(raw);
  if (!sanitized) {
    return new Response("AI response was missing required receipt fields", { status: 502 });
  }

  return new Response(JSON.stringify(sanitized), {
    headers: { "Content-Type": "application/json" },
  });
}
