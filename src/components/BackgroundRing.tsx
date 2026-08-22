/**
 * A subtle, slow-rotating gradient ring peeking in from the top of the
 * viewport — ambient brand decoration behind every page. Rendered once at
 * the app root so it persists across navigation instead of remounting
 * (and re-animating) on every route change.
 */
export function BackgroundRing() {
  const size = 620;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-[-100px] left-1/2 -translate-x-1/2 z-[-1] opacity-20 will-change-transform [transform:translateZ(0)] animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="bg-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 30}
          fill="none"
          stroke="url(#bg-ring-gradient)"
          strokeWidth={2.5}
          strokeDasharray="3 18"
          strokeLinecap="round"
          style={{ filter: "blur(0.5px)" }}
        />
      </svg>
    </div>
  );
}
