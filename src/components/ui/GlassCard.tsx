import { useRef, type MouseEvent, type ReactNode } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={`group relative rounded-[28px] gradient-border glass-inset ${
        strong ? "glass-strong" : "glass"
      } ${
        interactive
          ? "transition-transform duration-150 [transition-timing-function:var(--ease-spring)] active:scale-[0.98]"
          : ""
      } ${className}`}
    >
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle 240px at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.08), transparent 70%)",
          }}
        />
      )}
      {children}
    </div>
  );
}
