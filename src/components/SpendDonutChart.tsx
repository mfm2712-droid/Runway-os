import { useState } from "react";
import type { FinanceState } from "../types";
import { computeSpendBreakdown, spendBreakdownTotal, type SpendSlice } from "../lib/spendBreakdown";
import { formatCurrency, monthOverMonthDelta } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { getBucketLabel } from "../lib/i18n/labels";

const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PCT = 1.5; // visual gap between segments, in % of circumference

export function SpendDonutChart({
  state,
  stealth = false,
  onOpenDetail,
  onAddExpense,
}: {
  state: FinanceState;
  stealth?: boolean;
  onOpenDetail: (key: SpendSlice["key"]) => void;
  onAddExpense: () => void;
}) {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const slices = computeSpendBreakdown(state);
  const total = spendBreakdownTotal(state);
  const active = slices.find((s) => s.key === selected) ?? null;
  const momDelta = monthOverMonthDelta(state);

  let cumulativePct = 0;

  if (total <= 0) {
    return (
      <GlassCard opaque className="p-6 space-y-3 text-center">
        <p className="text-2xl" aria-hidden>
          🍩
        </p>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">{t("donut.noSpending")}</h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
            {t("donut.noSpendingDetail")}
          </p>
        </div>
        <Button variant="glass" onClick={onAddExpense} className="mx-auto px-5 py-2.5 text-xs">
          {t("donut.addExpense")}
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard opaque className="p-6 space-y-5">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-semibold text-white shrink-0">{t("donut.breakdown")}</h4>
          {momDelta !== null && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ${
                momDelta > 0.5
                  ? "bg-red-400/15 text-red-400"
                  : momDelta < -0.5
                  ? "bg-mint-400/15 text-mint-400"
                  : "bg-white/[0.06] text-slate-400"
              }`}
            >
              {momDelta > 0.5 ? "↑" : momDelta < -0.5 ? "↓" : "•"} {Math.abs(momDelta).toFixed(0)}% {t("donut.vsLastMonth")}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">{t("donut.tapForDetails")}</span>
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
            <div
              className={`flex flex-col items-center text-center px-4 transition-all duration-300 ${
                stealth ? "blur-sm select-none" : ""
              }`}
            >
              {active ? (
                <>
                  <span className="text-xl" aria-hidden>
                    {active.icon}
                  </span>
                  <span className="text-lg font-bold tracking-tight tabular-nums text-white mt-1">{formatCurrency(active.amount, state.currency)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {getBucketLabel(active.key, lang)} · {active.pct.toFixed(0)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold tracking-tight tabular-nums text-white">{formatCurrency(total, state.currency)}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{t("donut.thisMonth")}</span>
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
            onClick={() => {
              playClick();
              onOpenDetail(s.key);
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left border border-transparent transition-all duration-150 active:scale-[0.97] hover:bg-white/[0.04]"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: s.color, boxShadow: `0 0 6px ${s.color}aa` }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-300 truncate">{getBucketLabel(s.key, lang)}</p>
              <p
                className={`text-[10px] text-slate-500 tracking-tight tabular-nums transition-all duration-300 ${
                  stealth ? "blur-sm select-none" : ""
                }`}
              >
                <span className="font-semibold text-slate-300">{formatCurrency(s.amount, state.currency)}</span> ·{" "}
                {s.pct.toFixed(0)}%
              </p>
            </div>
            <span className="text-slate-600 shrink-0" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
