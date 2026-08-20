import { useEffect, useRef, useState } from "react";

/** Returns true briefly whenever `value` changes, for a recalculation pulse. */
export function usePulseOnChange(value: number, durationMs = 600): boolean {
  const [pulsing, setPulsing] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setPulsing(true);
    const id = window.setTimeout(() => setPulsing(false), durationMs);
    return () => window.clearTimeout(id);
  }, [value, durationMs]);

  return pulsing;
}
