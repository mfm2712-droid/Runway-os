// Shared in-memory sliding-window rate limiter for Edge Functions.
//
// Best-effort only: Vercel Edge Functions run as multiple, ephemeral,
// per-region instances with no shared state between them, so this caps a
// single hot instance rather than guaranteeing a strict global limit per
// IP. It's still worthwhile defense-in-depth against runaway clients and
// accidental loops burning AI-request quota — for a hard guarantee, put a
// real distributed limiter (e.g. Upstash Redis) in front instead.

const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function pruneStaleKeys(now: number, windowMs: number): void {
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter((t) => now - t < windowMs);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

/** Returns true if the request is allowed, false if `key` has exceeded `limit` requests within `windowMs`. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  pruneStaleKeys(now, windowMs);

  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}
