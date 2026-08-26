import type { ReactNode } from "react";

export function V2Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800/60 bg-[#11161F]/80 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function V2Mark({ mark, color, size = 36 }: { mark: string; color: string; size?: number }) {
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-lg font-bold text-[13px]"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1f`,
        color,
        border: `1px solid ${color}40`,
      }}
      aria-hidden
    >
      {mark}
    </span>
  );
}
