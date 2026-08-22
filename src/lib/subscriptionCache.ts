// Short-lived client-side cache in front of /api/verify-subscription so
// opening Settings and the Paywall back-to-back (or repeatedly) doesn't
// hit Stripe on every open — only the first check within the window does.

interface CacheEntry {
  active: boolean;
  checkedAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const cache = new Map<string, CacheEntry>();

/**
 * Returns whether `customerId`'s subscription is active, using a cached
 * result when it's fresh. Returns null (rather than a stale guess) when
 * there's no cache yet and the network request itself fails — callers
 * should treat null as "couldn't determine" and not downgrade access on it.
 */
export async function verifySubscriptionCached(customerId: string): Promise<boolean | null> {
  const cached = cache.get(customerId);
  const now = Date.now();
  if (cached && now - cached.checkedAt < CACHE_TTL_MS) return cached.active;

  try {
    const res = await fetch(`/api/verify-subscription?customerId=${encodeURIComponent(customerId)}`);
    if (!res.ok) return cached ? cached.active : null;
    const data = (await res.json()) as { active: boolean };
    cache.set(customerId, { active: data.active, checkedAt: now });
    return data.active;
  } catch {
    return cached ? cached.active : null;
  }
}
