const PATTERNS: Record<"light" | "medium" | "success", number[]> = {
  light: [10],
  medium: [20],
  success: [10, 50, 10],
};

/** No-op on desktop or unsupported browsers/iOS versions — feature-detected and never throws. */
export function triggerHaptic(type: "light" | "medium" | "success" = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // some browsers throw calling vibrate() outside a genuine user gesture
  }
}
