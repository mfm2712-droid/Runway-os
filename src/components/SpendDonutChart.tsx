import { useState } from "react";
import type { FinanceState } from "../types";
import { computeSpendBreakdown, spendBreakdownTotal } from "../lib/spendBreakdown";
import { formatCurrency } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";

const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PCT = 1.5; // visual gap between segments, in % of circumference

export function SpendDonutChart({ state }: { state: FinanceState }) {
  const [selected, setSelected] = useState<string | null>(null);
  const slices = computeSpendBreakdown(state);
  const total = spendBreakdownTotal(state);
  const active = slices.find((s) => s.key === selected) ?? null;

  let cumulativePct = 0;

  return (
    <GlassCard className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-white">Spend Breakdown</h4>
        <span className="text-[10px] text-slate-500">tap a slice</span>
      </div>

      <div className="flex justify-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={STROKE}
            />
            {slices.map((s) => {
              const startPct = cumulativePct;
              cumulativePct += s.pct;
              const segLen = Math.max(0, (s.pct / 100) * CIRCUMFERENCE - (GAP_PCT / 100) * CIRCUMFERENCE);
              const offset = (startPct / 100) * CIRCUMFERENCE;
              const isSelected = selected === s.key;
              const isDimmed = selected !== null && !isSelected;

              return (
                <circle
                  key={s.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={isSelected ? STROKE + 6 : STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${segLen} ${CIRCUMFERENCE - segLen}`}
                  strokeDashoffset={-offset}
                  opacity={isDimmed ? 0.28 : 1}
                  onClick={() => setSelected(isSelected ? null : s.key)}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    transitionTimingFunction: "var(--ease-spring)",
                    filter: isSelected
                      ? `drop-shadow(0 0 12px ${s.color}cc)`
                      : `drop-shadow(0 0 5px ${s.color}55)`,
                  }}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center text-center px-4">
              {active ? (
                <>
                  <span className="text-xl" aria-hidden>
                    {active.icon}
                  </span>
                  <span className="text-lg font-bold tracking-tight tabular-nums text-white mt-1">{formatCurrency(active.amount, state.currency)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {active.label} · {active.pct.toFixed(0)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold tracking-tight tabular-nums text-white">{formatCurrency(total, state.currency)}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">this month</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {slices.map((s) => (
          <button
            key={s.key}
            onClick={() => setSelected(selected === s.key ? null : s.key)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-150 active:scale-[0.97] ${
              selected === s.key ? "bg-white/[0.06] border border-white/[0.12]" : "border border-transparent"
            }`}
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: s.color, boxShadow: `0 0 6px ${s.color}aa` }}
            />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 truncate">{s.label}</p>
              <p className="text-[10px] text-slate-500 tracking-tight tabular-nums">
                <span className="font-semibold text-slate-300">{formatCurrency(s.amount, state.currency)}</span> ·{" "}
                {s.pct.toFixed(0)}%
              </p>
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
