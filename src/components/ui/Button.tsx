import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { playClick, playPop } from "../../lib/audio";

type Variant = "primary" | "glass" | "ghost";
type Sound = "click" | "pop" | "none";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
const timing = { transitionTimingFunction: "var(--ease-spring)" };

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-cyan-400 via-cyan-500 to-mint-400 text-obsidian-950 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-1.5px_2px_rgba(2,16,32,0.25),0_10px_28px_-8px_rgba(25,217,160,0.65)] hover:brightness-110",
  glass: "glass glass-inset text-white hover:bg-white/[0.06]",
  ghost: "text-slate-400 hover:text-white",
};

export function Button({
  variant = "primary",
  sound,
  className = "",
  children,
  onClick,
  ...props
}: {
  variant?: Variant;
  /** Overrides the default tap sound. Primary buttons click by default; pass "pop" for a success/confirm action, or "none" if the handler already plays its own. */
  sound?: Sound;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const effective = sound ?? (variant === "primary" ? "click" : "none");
    if (effective === "click") playClick();
    else if (effective === "pop") playPop();
    onClick?.(e);
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={timing}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
