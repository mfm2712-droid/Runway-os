// Vercel Edge Function — parses a receipt image via Anthropic's vision
// capability. Same setup as api/chat.ts: requires ANTHROPIC_API_KEY.
// Falls back client-side (src/lib/ai/client.ts) to a local heuristic parse
// if this endpoint is unavailable or errors.

/// <reference types="node" />

import { checkRateLimit, getClientIp } from "./_lib/rateLimit";

export const config = { runtime: "edge" };

const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000; // per minute

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5MB

const EXTRACT_PROMPT = `Extract the following fields from this receipt image and respond with ONLY a JSON object, no prose, no markdown fences:
{
  "merchant": string,
  "amount": number (total amount, no currency symbol),
  "category": one of "food" | "transport" | "housing" | "shopping" | "health" | "entertainment" | "other",
  "recurring": boolean (true only if this looks like a subscription/recurring charge, not a one-off purchase),
  "date": string (YYYY-MM-DD, use today's date if not visible on the receipt)
}`;

interface ReceiptBody {
  imageBase64: string;
  mimeType: string;
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
      max_tokens: 300,
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
  const text: string = data.content?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ""));
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("Could not parse AI response", { status: 502 });
  }
}
