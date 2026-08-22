import type { Currency, Expense } from "../types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "../types";
import { formatCurrency } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { TrashIcon } from "./ui/Icons";

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function SummaryBar({
  expenses,
  currency,
  stealth,
}: {
  expenses: Expense[];
  currency: Currency;
  stealth: boolean;
}) {
  const thisMonth = expenses.filter((e) => isThisMonth(e.date));
  const total = thisMonth.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs">
      <span className="text-slate-400">This Month</span>
      <span
        className={`font-semibold tracking-tight tabular-nums text-white transition-all duration-300 ${
          stealth ? "blur-sm select-none" : ""
        }`}
      >
        {formatCurrency(total, currency)}
      </span>
      <span className="text-slate-600">•</span>
      <span className="text-slate-400">
        {thisMonth.length} transaction{thisMonth.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function ExpenseHistory({
  expenses,
  currency,
  onRemove,
  stealth = false,
}: {
  expenses: Expense[];
  currency: Currency;
  onRemove: (id: string) => void;
  stealth?: boolean;
}) {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <SummaryBar expenses={expenses} currency={currency} stealth={stealth} />

      <GlassCard className="p-6 space-y-4">
        <h4 className="text-sm font-semibold text-white">Recent Expenses</h4>

        {sorted.length === 0 && (
          <p className="text-xs text-slate-400 py-2">
            No expenses logged yet. Tap the + button to start tracking.
          </p>
        )}

        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {sorted.slice(0, 25).map((e) => (
            <li
              key={e.id}
              className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/[0.05] text-base leading-none">
                  {CATEGORY_ICONS[e.category]}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-200 truncate">
                    {CATEGORY_LABELS[e.category]}
                  </p>
                  <p className="text-[10px] text-slate-500">{e.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-semibold tracking-tight text-slate-200 tabular-nums transition-all duration-300 ${
                    stealth ? "blur-sm select-none" : ""
                  }`}
                >
                  {formatCurrency(e.amount, currency)}
                </span>
                <button
                  onClick={() => onRemove(e.id)}
                  title="Remove"
                  aria-label="Remove expense"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <TrashIcon width={15} height={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
