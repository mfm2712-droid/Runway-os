import { useEffect, useState } from "react";
import {
  applyDesignLabTokens,
  readDesignLabTokens,
  type DesignLabTokens,
} from "../lib/designLabBridge";
import { DESIGN_LAB_TOKENS_KEY } from "../lib/storageKeys";

/**
 * Reads tokens cloned from public/design-lab.html on mount and applies the
 * CSS-var-drivable ones to :root immediately. If the Design Lab is open in
 * another tab of the same browser, its clone writes fire a `storage` event
 * here and this re-applies live — no reload needed.
 */
export function useDesignLabOverrides(): DesignLabTokens | null {
  const [tokens, setTokens] = useState<DesignLabTokens | null>(() => readDesignLabTokens());

  useEffect(() => {
    if (tokens) applyDesignLabTokens(tokens);
  }, [tokens]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== DESIGN_LAB_TOKENS_KEY) return;
      setTokens(readDesignLabTokens());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return tokens;
}
