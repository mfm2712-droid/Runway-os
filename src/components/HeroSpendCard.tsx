import { useState } from "react";
import type { FinanceState } from "../types";
import {
  dailySafeSpend,
  formatCurrency,
  runwayMonths,
  spendingHorizonDays,
} from "../lib/calculations";
import type { StreakData } from "../lib/streak";
import type { DailySeries } from "../lib/dailySeries";
import { usePulseOnChange } from "../hooks/usePulseOnChange";
import { GlassCard } from "./ui/GlassCard";
import { RingProgress } from "./ui/RingProgress";
import { QuickTuneModal } from "./QuickTuneModal";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { SafeSpendSparkline } from "./SafeSpendSparkline";
import { triggerHaptic } from "../lib/haptics";
import { playClick } from "../lib/audio";

function healthColor(months: number): string {
  if (!Number.isFinite(months) || months >= 4) return "#34d399";
  if (months >= 1.5) return "#fbbf24";
  return "#fb7185";
}

export function HeroSpendCard({
  state,
  onChange,
  stealth = false,
  streak,
  series,
}: {
  state: FinanceState;
  onChange: (patch: Partial<FinanceState>) => void;
  stealth?: boolean;
  streak?: StreakData;
  series?: DailySeries;
}) {
  const [tuneOpen, setTuneOpen] = useState(false);
  const safeSpend = dailySafeSpend(state);
  const days = spendingHorizonDays(state);
  const runway = runwayMonths(state);
  const color = healthColor(runway);
  const ringValue = Number.isFinite(runway) ? Math.min(1, runway / 6) : 1;
  const pulsing = usePulseOnChange(Math.round(safeSpend * 100));

  return (
    <GlassCard strong className="relative overflow-hidden px-6 py-10 flex flex-col items-center text-center">
      <div className="mesh-glow" />
      <p className="relative text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-6">
        Daily Safe Spend
      </p>

      <button
        onClick={() => {
          triggerHaptic("light");
          playClick();
          setTuneOpen(true);
        }}
        aria-label="Tune your numbers"
        className={`relative rounded-full active:scale-[0.97] transition-transform duration-200 ${
          pulsing ? "ring-pulse" : ""
        }`}
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      >
        <RingProgress value={ringValue} size={232} strokeWidth={12} color={color}>
          <div className={`flex flex-col items-center transition-all duration-300 ${stealth ? "blur-md select-none" : ""}`}>
            <AnimatedNumber
              value={safeSpend}
              format={(v) => formatCurrency(v, state.currency)}
              className="text-5xl font-extrabold tracking-tight tabular-nums text-white glow-text"
              style={{ color }}
            />
            <span className="text-xs text-slate-400 mt-2">
              safe for the next {days} day{days === 1 ? "" : "s"}
              {state.paydayDay ? " · to payday" : ""}
            </span>
          </div>
        </RingProgress>
      </button>

      <p className={`relative text-[11px] text-slate-500 mt-6 transition-all duration-300 ${stealth ? "blur-sm select-none" : ""}`}>
        Runway health · {Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : "∞"}
      </p>
      <p className="relative text-[10px] text-slate-400 mt-1">Tap the ring to tune your numbers</p>

      {!!streak && streak.count > 0 && (
        <p className="relative text-[11px] font-medium text-amber-300 mt-3">
          🔥 {streak.count}-day safe spend streak
        </p>
      )}

      {!!series && series.length >= 2 && (
        <div className="relative w-full mt-5">
          <SafeSpendSparkline series={series} />
        </div>
      )}

      <QuickTuneModal
        open={tuneOpen}
        onClose={() => setTuneOpen(false)}
        state={state}
        onChange={onChange}
      />
    </GlassCard>
  );
}
