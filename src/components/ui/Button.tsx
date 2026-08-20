import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "glass" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
const timing = { transitionTimingFunction: "var(--ease-spring)" };

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-sky-400 to-sky-500 text-obsidian-950 shadow-[0_0_0_1px_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_rgba(56,189,248,0.6)] hover:brightness-110",
  glass: "glass glass-inset text-white hover:bg-white/[0.06]",
  ghost: "text-slate-400 hover:text-white",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} style={timing} {...props}>
      {children}
    </button>
  );
}
