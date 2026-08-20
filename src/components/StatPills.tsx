import type { FinanceState } from "../types";
import {
  formatCurrency,
  formatMonths,
  runwayMonths,
  subscriptionsTotal,
  unusedSubscriptionsTotal,
} from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";

export function StatPills({ state }: { state: FinanceState }) {
  const runway = runwayMonths(state);
  const subsTotal = subscriptionsTotal(state);
  const unusedTotal = unusedSubscriptionsTotal(state);
  const unusedCount = state.subscriptions.filter((s) => s.flaggedUnused).length;

  return (
    <div className="grid grid-cols-2 gap-3">
      <GlassCard className="px-4 py-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Runway
        </p>
        <p className="text-xl font-bold tracking-tight text-white mt-1 tabular-nums">
          {formatMonths(runway)} <span className="text-xs font-normal text-slate-500">mo</span>
        </p>
      </GlassCard>
      <GlassCard className="px-4 py-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Recurring Leaks
        </p>
        <p className="text-xl font-bold tracking-tight text-white mt-1 tabular-nums">
          {formatCurrency(subsTotal, state.currency)}
        </p>
        {unusedCount > 0 && (
          <p className="text-[10px] text-rose-400 mt-0.5">
            {unusedCount} unused · {formatCurrency(unusedTotal, state.currency)}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
