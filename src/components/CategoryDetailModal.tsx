import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FinanceState } from "../types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "../types";
import { formatCurrency } from "../lib/calculations";
import { computeSpendBreakdown, isThisMonth, LEISURE_CATEGORIES, type SpendSlice } from "../lib/spendBreakdown";
import { backdropVariants, panelVariants } from "../lib/motionPresets";
import { triggerHaptic } from "../lib/haptics";
import { playClick } from "../lib/audio";
import { TrashIcon } from "./ui/Icons";

export function CategoryDetailModal({
  bucketKey,
  state,
  onClose,
  onRemoveExpense,
  onEditFixedCosts,
}: {
  bucketKey: SpendSlice["key"] | null;
  state: FinanceState;
  onClose: () => void;
  onRemoveExpense: (id: string) => void;
  onEditFixedCosts: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const slice = bucketKey ? computeSpendBreakdown(state).find((s) => s.key === bucketKey) ?? null : null;

  const dismiss = () => {
    playClick();
    onClose();
  };

  const remove = (id: string) => {
    triggerHaptic("light");
    onRemoveExpense(id);
  };

  // Each bucket maps to a different slice of the data model — "leisure" and
  // "subscriptions" in particular aren't a single ExpenseCategory, so the
  // list contents (and what's removable here vs. managed elsewhere) differ
  // per bucket rather than being one generic category filter.
  const categoryExpenses =
    bucketKey === "food"
      ? state.expenses.filter((e) => e.category === "food" && isThisMonth(e.date))
      : bucketKey === "housing"
      ? state.expenses.filter(
          (e) => (e.category === "housing" || e.category === "bills") && isThisMonth(e.date),
        )
      : bucketKey === "leisure"
      ? state.expenses.filter((e) => LEISURE_CATEGORIES.includes(e.category) && isThisMonth(e.date))
      : [];

  const sorted = [...categoryExpenses].sort((a, b) => b.date.localeCompare(a.date));
  const count = sorted.length;
  const sum = sorted.reduce((s, e) => s + e.amount, 0);
  const average = count > 0 ? sum / count : 0;

  return (
    <AnimatePresence>
      {slice && (
        <motion.div
          className="fixed inset-0 z-[68] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={dismiss}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-5 max-h-[85vh] overflow-y-auto"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={`${slice.label} details`}
          >
            <div className="mesh-glow opacity-60" />
            <div className="relative flex justify-center md:hidden -mt-1">
              <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
            </div>

            <div className="relative flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden>
                  {slice.icon}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">{slice.label}</h3>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(slice.amount, state.currency)} · {slice.pct.toFixed(0)}% of monthly spend
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {bucketKey === "housing" && state.fixedMonthlyOutflows > 0 && (
              <div className="relative flex justify-between items-center text-xs rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                <div>
                  <p className="text-slate-300">Fixed Monthly Outflows</p>
                  <p className="text-[10px] text-slate-500">Rent, bills</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold tabular-nums text-slate-300">
                    {formatCurrency(state.fixedMonthlyOutflows, state.currency)}
                  </span>
                  <button
                    onClick={onEditFixedCosts}
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {bucketKey === "subscriptions" ? (
              <div className="relative space-y-2">
                <p className="text-[11px] text-slate-500 px-1">
                  Manage or cancel these in the Subscriptions tab.
                </p>
                <ul className="space-y-2">
                  {state.subscriptions.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06]"
                    >
                      <span className="text-slate-200">{s.name}</span>
                      <span className="font-semibold tabular-nums text-slate-200">
                        {formatCurrency(s.amount, state.currency)}/mo
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="relative space-y-2">
                {sorted.length === 0 && (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    No expenses logged in this category this month.
                  </p>
                )}
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sorted.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/[0.05] text-base leading-none">
                          {CATEGORY_ICONS[e.category]}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-200 truncate">
                            {e.note || CATEGORY_LABELS[e.category]}
                          </p>
                          <p className="text-[10px] text-slate-500">{e.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold tracking-tight text-slate-200 tabular-nums">
                          {formatCurrency(e.amount, state.currency)}
                        </span>
                        <button
                          onClick={() => remove(e.id)}
                          aria-label="Remove expense"
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <TrashIcon width={15} height={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bucketKey !== "subscriptions" && (
              <div className="relative grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.08] text-center">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Count</p>
                  <p className="text-sm font-semibold tabular-nums text-white mt-0.5">{count}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Average</p>
                  <p className="text-sm font-semibold tabular-nums text-white mt-0.5">
                    {formatCurrency(average, state.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Sum</p>
                  <p className="text-sm font-semibold tabular-nums text-white mt-0.5">
                    {formatCurrency(sum, state.currency)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
