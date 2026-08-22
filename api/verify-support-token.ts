// Vercel Edge Function — verifies a hand-issued support access code against
// a server-only secret. This replaces the old client-side "any correctly
// formatted string is accepted" license key: without this env var set, the
// endpoint always returns invalid, so there's no way to grant Pro access
// without the operator explicitly opting in.
//
// Setup: set SUPPORT_ACCESS_TOKEN in your Vercel project's environment
// variables to enable this path at all. Leave it unset to disable manual
// support access entirely — Stripe Checkout / restore-by-email remain the
// only way in.

/// <reference types="node" />

export const config = { runtime: "edge" };

interface VerifyBody {
  token: string;
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new Uint8Array(digest);
}

// Comparing the raw strings directly (or any early-exit loop over them)
// leaks how many leading characters matched via response timing. Hashing
// both sides first fixes the comparison to a constant 32-byte digest
// regardless of input length, then XOR-accumulating without branching
// keeps the byte comparison itself constant-time.
async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = process.env.SUPPORT_ACCESS_TOKEN;
  if (!secret) {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const valid = token.length > 0 && (await timingSafeStringEqual(token, secret));

  return new Response(JSON.stringify({ valid }), {
    headers: { "Content-Type": "application/json" },
  });
}
