// Vercel Edge Function — parses a receipt image via Anthropic's vision
// capability. Same setup as api/chat.ts: requires ANTHROPIC_API_KEY.
// Falls back client-side (src/lib/ai/client.ts) to a local heuristic parse
// if this endpoint is unavailable or errors.

export const config = { runtime: "edge" };

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("AI backend not configured", { status: 500 });
  }

  const body = (await req.json()) as ReceiptBody;
  if (!body.imageBase64) {
    return new Response("Missing imageBase64", { status: 400 });
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
                media_type: body.mimeType || "image/jpeg",
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
