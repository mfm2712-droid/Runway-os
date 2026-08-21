import { useId } from "react";
import { motion } from "motion/react";
import { springTransition } from "../../lib/motionPresets";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const layoutId = useId();
  const n = options.length;

  return (
    <div
      className={`relative grid p-1 rounded-full glass ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative py-2 text-xs font-medium rounded-full transition-colors ${
            o.value === value ? "text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {o.value === value && (
            <motion.div
              layoutId={`${layoutId}-indicator`}
              className="absolute inset-0 -z-10 rounded-full bg-white/[0.1] border border-white/[0.12]"
              transition={springTransition}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}
