import { useEffect, useRef, useState, type CSSProperties } from "react";

const SETTLE_EPSILON = 0.01;

// Local stand-in for motion/react's useReducedMotion: importing that hook
// alone pulls the whole `motion` runtime into any bundle that references
// this component, including the eager landing chunk. This is behaviorally
// identical (reactive to the OS-level media query) without the dependency.
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/**
 * Spring-driven count-up/count-down via a plain requestAnimationFrame
 * integrator (semi-implicit Euler) — avoids depending on `motion`'s
 * MotionValue/useSpring source-tracking, which only snapshots a value at
 * mount rather than following later updates. Guards against Infinity
 * (runway can be infinite at zero burn) by snapping straight to the
 * formatted value instead of animating toward it.
 */
export function AnimatedNumber({
  value,
  format,
  className = "",
  style,
  stiffness = 220,
  damping = 30,
  mass = 0.6,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
  style?: CSSProperties;
  stiffness?: number;
  damping?: number;
  mass?: number;
}) {
  const reduceMotion = useReducedMotion();
  const finite = Number.isFinite(value);
  const [display, setDisplay] = useState(() => format(value));
  const current = useRef(finite ? value : 0);
  const velocity = useRef(0);

  useEffect(() => {
    if (!finite || reduceMotion) {
      if (finite) current.current = value;
      velocity.current = 0;
      setDisplay(format(value));
      return;
    }

    let rafId: number;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.064);
      last = now;

      const displacement = current.current - value;
      const acceleration = (-stiffness * displacement - damping * velocity.current) / mass;
      velocity.current += acceleration * dt;
      current.current += velocity.current * dt;

      const settled =
        Math.abs(current.current - value) < SETTLE_EPSILON && Math.abs(velocity.current) < SETTLE_EPSILON;
      if (settled) {
        current.current = value;
        velocity.current = 0;
        setDisplay(format(value));
        return;
      }
      setDisplay(format(current.current));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, finite, reduceMotion, format, stiffness, damping, mass]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
