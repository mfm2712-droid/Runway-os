// Vercel Edge Function — streams a Money Copilot reply from the Anthropic API.
//
// Setup: set ANTHROPIC_API_KEY in your Vercel project's environment
// variables (Project Settings → Environment Variables). Never commit it —
// see .env.example. Without it, this returns 500 and the client
// (src/lib/ai/client.ts) transparently falls back to simulated replies.
//
// Local `vite dev` does NOT run this file — Vite only serves the frontend.
// To test it locally, either `vercel dev` (runs both) or deploy to Vercel.

/// <reference types="node" />

import { checkRateLimit, getClientIp } from "./_lib/rateLimit";

export const config = { runtime: "edge" };

const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000; // per minute

const ADVISOR_SYSTEM_PROMPT = `You are Money Copilot, the built-in financial advisor for Runway OS, a minimalist personal finance tool.
Rules:
- Base every answer strictly on the USER FINANCIAL SNAPSHOT provided. Never invent numbers.
- Be direct and concise (2-4 short sentences, or a tight bulleted list). No filler, no disclaimers about "consult a professional" unless the question is genuinely outside personal budgeting.
- Prefer concrete, specific recommendations over generic advice ("cancel Cloud Storage & Tools to save 29/mo" beats "review your subscriptions").
- Use the exact currency symbol and figures from the snapshot — never assume GBP or £, always match the snapshot's currency.
- You are not a licensed financial advisor and must not give investment, tax, or legal advice — redirect those questions.
- Write in plain text only. Do NOT use markdown: no **bold**, no *italic*, no # headers, no \`\`\` code fences, and never wrap words in asterisks for emphasis. If listing items, use a plain dash "-" or numbers "1." with no bold markup.`;

interface ChatBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context: string;
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

  const body = (await req.json()) as ChatBody;
  const messages = (body.messages ?? []).slice(-12); // cap history sent per request

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
      system: `${ADVISOR_SYSTEM_PROMPT}\n\n${body.context}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream AI error: ${upstream.status}`, { status: 502 });
  }

  // Re-emit Anthropic's SSE text deltas as a plain text stream so the
  // client doesn't need an SSE parser.
  const plainTextStream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload);
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          } catch {
            // ignore malformed/partial SSE lines
          }
        }
      }
      controller.close();
    },
  });

  return new Response(plainTextStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
