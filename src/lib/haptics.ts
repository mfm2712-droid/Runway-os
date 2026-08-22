const PATTERNS: Record<"light" | "medium" | "success", number[]> = {
  light: [10],
  medium: [20],
  success: [10, 50, 10],
};

/** No-op on desktop/unsupported browsers — navigator.vibrate is optional and never throws. */
export function triggerHaptic(type: "light" | "medium" | "success" = "light"): void {
  navigator.vibrate?.(PATTERNS[type]);
}
