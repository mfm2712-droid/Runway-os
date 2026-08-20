import type { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  strong = false,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[28px] gradient-border glass-inset ${
        strong ? "glass-strong" : "glass"
      } ${
        interactive
          ? "transition-transform duration-150 [transition-timing-function:var(--ease-spring)] active:scale-[0.98]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
