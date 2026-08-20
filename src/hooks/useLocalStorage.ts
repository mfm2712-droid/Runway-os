import { useEffect, useState } from "react";

/**
 * Merges stored JSON with `initialValue` at the top level, so adding a new
 * field to a default-state object doesn't require a storage-key version
 * bump — existing users just get the new field's default value, everything
 * else they've already saved is preserved.
 */
function mergeWithDefaults<T>(initialValue: T, stored: unknown): T {
  const isPlainObject =
    typeof initialValue === "object" && initialValue !== null && !Array.isArray(initialValue);
  if (isPlainObject && typeof stored === "object" && stored !== null && !Array.isArray(stored)) {
    return { ...(initialValue as object), ...(stored as object) } as T;
  }
  return stored as T;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? mergeWithDefaults(initialValue, JSON.parse(stored)) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing quota, etc.) — fail silently
    }
  }, [key, value]);

  return [value, setValue] as const;
}
