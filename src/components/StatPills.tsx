import { useState } from "react";
import type { FinanceState } from "../types";
import {
  formatCurrency,
  formatRunwayDisplay,
  runwayMonths,
  subscriptionsTotal,
  unusedSubscriptionsTotal,
} from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { InfoIcon } from "./ui/Icons";
import { RunwayExplainerModal } from "./RunwayExplainerModal";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function StatPills({ state, stealth = false }: { state: FinanceState; stealth?: boolean }) {
  const { t } = useLanguage();
  const runway = runwayMonths(state);
  const subsTotal = subscriptionsTotal(state);
  const unusedTotal = unusedSubscriptionsTotal(state);
  const unusedCount = state.subscriptions.filter((s) => s.flaggedUnused).length;
  const maskClass = `transition-all duration-300 ${stealth ? "blur-sm select-none" : ""}`;
  const [explainerOpen, setExplainerOpen] = useState(false);
  const runwayUnit = formatRunwayDisplay(runway, t("stats.sustainable")).unit;

  return (
    <div className="grid grid-cols-2 gap-3">
      <GlassCard className="px-4 py-4">
        <div className="flex items-center gap-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {t("stats.runway")}
          </p>
          <button
            onClick={() => {
              playClick();
              setExplainerOpen(true);
            }}
            aria-label={t("stats.runwayInfo")}
            className="text-slate-600 hover:text-slate-400 transition-colors -m-1 p-1"
          >
            <InfoIcon width={12} height={12} />
          </button>
        </div>
        <p className={`text-xl font-bold tracking-tight text-white mt-1 tabular-nums ${maskClass}`}>
          <AnimatedNumber value={runway} format={(v) => formatRunwayDisplay(v).value} />{" "}
          <span className="text-xs font-normal text-slate-500">{runwayUnit}</span>
        </p>
      </GlassCard>
      <GlassCard className="px-4 py-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {t("stats.recurringLeaks")}
        </p>
        <p className={`text-xl font-bold tracking-tight text-white mt-1 tabular-nums ${maskClass}`}>
          <AnimatedNumber value={subsTotal} format={(v) => formatCurrency(v, state.currency)} />
        </p>
        {unusedCount > 0 && (
          <p className={`text-[10px] text-rose-400 mt-0.5 ${maskClass}`}>
            {t("stats.unused", { count: unusedCount, amount: formatCurrency(unusedTotal, state.currency) })}
          </p>
        )}
      </GlassCard>
      <RunwayExplainerModal open={explainerOpen} onClose={() => setExplainerOpen(false)} state={state} />
    </div>
  );
}
