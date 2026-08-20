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
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;

  return (
    <div
      className={`relative grid p-1 rounded-full glass ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <div
        className="absolute top-1 bottom-1 rounded-full bg-white/[0.1] border border-white/[0.12] transition-transform duration-300"
        style={{
          width: `calc(${100 / n}% - 4px)`,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
          transitionTimingFunction: "var(--ease-spring)",
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 py-2 text-xs font-medium rounded-full transition-colors ${
            o.value === value ? "text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
