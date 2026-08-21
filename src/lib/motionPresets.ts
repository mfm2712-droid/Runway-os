import type { Transition, Variants } from "motion/react";

/** Apple-ish snap: fast settle, no visible jitter or overshoot bounce. */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 28,
};

export function backdropVariants(reduceMotion: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } },
    exit: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.15 } },
  };
}

/** Bottom-sheet-on-mobile / centered-modal-on-desktop panel motion. */
export function panelVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.95, y: 24 },
    visible: { opacity: 1, scale: 1, y: 0, transition: springTransition },
    exit: { opacity: 0, scale: 0.9, y: 12, filter: "blur(8px)", transition: { duration: 0.18 } },
  };
}
