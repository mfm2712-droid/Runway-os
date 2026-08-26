import type { CSSProperties } from "react";

export function PremiumSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  color = "#00e5ff",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const style = {
    "--slider-pct": `${pct}%`,
    "--slider-color": color,
  } as CSSProperties;

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-sm font-semibold tracking-tight text-white tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        className="premium-slider"
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
