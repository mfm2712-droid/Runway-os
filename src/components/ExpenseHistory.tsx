import { useEffect, useRef, useState } from "react";
import type { Currency, Expense } from "../types";
import { CATEGORY_ICONS } from "../types";
import { formatCurrency } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { TrashIcon } from "./ui/Icons";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { getCategoryLabel } from "../lib/i18n/labels";

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
  const { t } = useLanguage();
  const thisMonth = expenses.filter((e) => isThisMonth(e.date));
  const total = thisMonth.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs">
      <span className="text-slate-400">{t("history.thisMonth")}</span>
      <span
        className={`font-semibold tracking-tight tabular-nums text-white transition-all duration-300 ${
          stealth ? "blur-sm select-none" : ""
        }`}
      >
        {formatCurrency(total, currency)}
      </span>
      <span className="text-slate-600">•</span>
      <span className="text-slate-400">
        {thisMonth.length} {thisMonth.length === 1 ? t("history.transaction") : t("history.transactions")}
      </span>
    </div>
  );
}

function MasterCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-cyan-400 cursor-pointer"
    />
  );
}

function SelectionBar({
  count,
  onDelete,
}: {
  count: number;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      role="region"
      aria-label={t("history.deleteSelected")}
      className="space-y-2 px-4 py-3 rounded-2xl bg-red-400/[0.06] border border-red-400/20 animate-[floatIn_0.2s_var(--ease-spring)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-200 tabular-nums">
          {t(count === 1 ? "history.selectedOne" : "history.selectedOther", { count })}
        </span>
        {!confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] font-semibold text-red-400 px-3 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/15 active:scale-[0.97] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {t("history.deleteSelected")}
          </button>
        )}
      </div>
      {confirming && (
        <div className="space-y-2 animate-[floatIn_0.15s_var(--ease-spring)]">
          <p className="text-[11px] text-slate-400">
            {t("history.confirmDeleteMessage", { count, plural: count === 1 ? "" : "s" })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-red-500 text-white active:scale-[0.97] transition-transform"
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
            >
              {t("history.confirmDeleteConfirm")}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("history.confirmDeleteCancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpenseHistory({
  expenses,
  currency,
  onRemove,
  onRemoveMany,
  onAddExpense,
  stealth = false,
}: {
  expenses: Expense[];
  currency: Currency;
  onRemove: (id: string) => void;
  onRemoveMany: (ids: string[]) => void;
  onAddExpense: () => void;
  stealth?: boolean;
}) {
  const { t, lang } = useLanguage();
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const visible = sorted.slice(0, 25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.has(e.id));
  const someVisibleSelected = visible.some((e) => selected.has(e.id));

  const toggleAll = () =>
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const e of visible) next.delete(e.id);
        return next;
      }
      const next = new Set(prev);
      for (const e of visible) next.add(e.id);
      return next;
    });

  const deleteSelected = () => {
    onRemoveMany([...selected]);
    setSelected(new Set());
  };

  if (sorted.length === 0) {
    return (
      <GlassCard opaque className="p-6 space-y-3 text-center">
        <p className="text-2xl" aria-hidden>
          🧾
        </p>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">{t("history.noExpensesYet")}</h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
            {t("history.noExpensesDetail")}
          </p>
        </div>
        <Button variant="glass" onClick={onAddExpense} className="mx-auto px-5 py-2.5 text-xs">
          {t("donut.addExpense")}
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryBar expenses={expenses} currency={currency} stealth={stealth} />

      {selected.size > 0 && <SelectionBar count={selected.size} onDelete={deleteSelected} />}

      <GlassCard opaque className="p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <MasterCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected && !allVisibleSelected}
            onChange={toggleAll}
            label={t("history.selectAll")}
          />
          <h4 className="text-sm font-semibold text-white">{t("history.recentExpenses")}</h4>
        </div>

        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {visible.map((e) => (
            <li
              key={e.id}
              className="flex justify-between items-center text-xs p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggleOne(e.id)}
                  aria-label={`${t("history.selectExpense")}: ${e.note || getCategoryLabel(e.category, lang)}, ${formatCurrency(e.amount, currency)}`}
                  className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-cyan-400 cursor-pointer"
                />
                <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/[0.05] text-base leading-none">
                  {CATEGORY_ICONS[e.category]}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-200 truncate">
                    {e.note || getCategoryLabel(e.category, lang)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {e.note ? `${getCategoryLabel(e.category, lang)} · ${e.date}` : e.date}
                  </p>
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
