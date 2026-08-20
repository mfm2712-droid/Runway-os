import { useEffect, useRef, useState } from "react";

/**
 * Reveals `text` progressively. Re-runs whenever `text` grows (used to
 * typewriter-reveal both simulated replies and real streamed chunks).
 */
export function useTypewriter(text: string, active: boolean, speedMs = 14) {
  const [shown, setShown] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setShown(text);
      indexRef.current = text.length;
      return;
    }
    if (indexRef.current > text.length) indexRef.current = 0;

    const id = window.setInterval(() => {
      indexRef.current += 1;
      setShown(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) window.clearInterval(id);
    }, speedMs);

    return () => window.clearInterval(id);
  }, [text, active, speedMs]);

  const done = shown.length >= text.length;
  return { shown, done };
}
