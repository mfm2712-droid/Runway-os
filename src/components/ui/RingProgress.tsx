import { useRef, type CSSProperties, type ReactNode } from "react";

let ringIdCounter = 0;

export function RingProgress({
  value,
  size = 220,
  strokeWidth = 14,
  color = "#00ffc6",
  colorEnd,
  /** Full multi-stop gradient along the stroke — overrides color/colorEnd when given. Each stop is `{ offset: "0%"..."100%", color }`. */
  stops,
  trackColor = "rgba(255,255,255,0.06)",
  /** When true, the outer box is sized by CSS (via `className`) instead of a fixed `size`px box — `size` still drives the internal stroke/radius math via viewBox, so the drawing scales with whatever size the container ends up at. */
  fluid = false,
  className = "",
  style,
  /** Outer bloom blur radius in px — `drop-shadow(0 0 {glowBlur}px ...)`. */
  glowBlur = 14,
  /** Outer bloom alpha (0..1) applied to the glow colour. */
  glowOpacity = 0.5,
  children,
}: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Second stop for a two-tone gradient stroke — defaults to `color` (single-hue, original look). */
  colorEnd?: string;
  stops?: { offset: string; color: string }[];
  trackColor?: string;
  fluid?: boolean;
  className?: string;
  style?: CSSProperties;
  glowBlur?: number;
  glowOpacity?: number;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const gradientId = useRef(`ring-gradient-${ringIdCounter++}`).current;
  const twoTone = colorEnd !== undefined && colorEnd !== color;
  const endColor = colorEnd ?? color;
  const glowColor = stops?.[0]?.color ?? color;
  const glowAlphaHex = Math.round(glowOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={fluid ? style : { width: size, height: size, ...style }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {stops ? (
              stops.map((s) => (
                <stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  style={{ transition: "stop-color 0.4s ease" }}
                />
              ))
            ) : (
              <>
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity={twoTone ? 1 : 0.55}
                  style={{ transition: "stop-color 0.4s ease" }}
                />
                <stop offset="100%" stopColor={endColor} stopOpacity="1" style={{ transition: "stop-color 0.4s ease" }} />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          style={{ transition: "stroke 0.4s ease" }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s var(--ease-spring), filter 0.4s ease",
            filter: `drop-shadow(0 0 ${glowBlur}px ${glowColor}${glowAlphaHex})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
