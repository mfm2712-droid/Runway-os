import { useState } from "react";
import type { FinanceState } from "../types";
import {
  dailySafeSpend,
  formatCurrency,
  spendingHorizonDays,
  spentThisMonth,
  totalMonthlyOutflow,
} from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { playClick } from "../lib/audio";

function Term({
  icon,
  label,
  value,
  operator,
}: {
  icon: string;
  label: string;
  value: string;
  operator?: "−" | "=";
}) {
  return (
    <div className="flex items-center gap-3">
      {operator && (
        <span className="text-sm text-slate-600 w-3 shrink-0 text-center" aria-hidden>
          {operator}
        </span>
      )}
      <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-cyan-400/10 text-sm">
        {icon}
      </span>
      <span className="flex-1 text-xs text-slate-400 truncate">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

export function SafeSpendBreakdown({ state }: { state: FinanceState }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  const cash = state.cashBalance;
  const costs = totalMonthlyOutflow(state) + spentThisMonth(state);
  const buffer = state.safetyBuffer || 0;
  const remaining = Math.max(0, cash - costs - buffer);
  const days = spendingHorizonDays(state);
  const safeToday = dailySafeSpend(state);
  const tight = remaining <= 0;

  return (
    <GlassCard opaque className="p-5 space-y-4">
      <button
        onClick={() => {
          playClick();
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between text-[10px] font-semibold text-cyan-400 uppercase tracking-wider"
      >
        {t("safeSpendBreakdown.title")}
        <span aria-hidden>{open ? "︿" : "⌄"}</span>
      </button>

      {open && (
        <div className="space-y-2.5 animate-[floatIn_0.2s_var(--ease-spring)]">
          <Term icon="💰" label={t("safeSpendBreakdown.cashBalance")} value={formatCurrency(cash, state.currency)} />
          <Term
            icon="🧾"
            label={t("safeSpendBreakdown.costsAndSpent")}
            value={formatCurrency(costs, state.currency)}
            operator="−"
          />
          <Term
            icon="🛡️"
            label={t("safeSpendBreakdown.safetyBuffer")}
            value={formatCurrency(buffer, state.currency)}
            operator="−"
          />
          <div className="pt-2 border-t border-white/[0.08]">
            <Term
              icon="✓"
              label={t("safeSpendBreakdown.remaining")}
              value={formatCurrency(remaining, state.currency)}
              operator="="
            />
          </div>
          <p className="text-[10px] text-slate-500 text-center pt-1">
            {t("safeSpendBreakdown.perDayOverDays", {
              days,
              amount: formatCurrency(safeToday, state.currency),
            })}
          </p>
          <p className={`text-[11px] font-medium text-center ${tight ? "text-orange-400" : "text-cyan-400"}`}>
            {tight ? `⚠️ ${t("safeSpendBreakdown.tight")}` : `✓ ${t("safeSpendBreakdown.onTrack")}`}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
