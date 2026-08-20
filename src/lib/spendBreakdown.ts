import type { Expense, FinanceState } from "../types";
import { spentThisMonth, subscriptionsTotal, totalMonthlyOutflow } from "./calculations";

export interface SpendSlice {
  key: "housing" | "food" | "leisure" | "subscriptions";
  label: string;
  icon: string;
  color: string;
  amount: number;
  pct: number;
}

const LEISURE_CATEGORIES: Expense["category"][] = [
  "transport",
  "shopping",
  "health",
  "entertainment",
  "other",
];

/**
 * Groups the user's full monthly footprint (fixed costs + subscriptions +
 * this month's logged expenses) into four buckets for the overview donut.
 * Real numbers throughout — housing/food/leisure pull from actual logged
 * expenses this month, subscriptions from the tracked list, and fixed
 * monthly outflows (rent, bills) are folded into Housing since that's what
 * they overwhelmingly represent for most users.
 */
export function computeSpendBreakdown(state: FinanceState): SpendSlice[] {
  const byCategory = (cats: Expense["category"][]) =>
    state.expenses
      .filter((e) => cats.includes(e.category) && isThisMonth(e.date))
      .reduce((sum, e) => sum + e.amount, 0);

  const housing = state.fixedMonthlyOutflows + byCategory(["housing"]);
  const food = byCategory(["food"]);
  const leisure = byCategory(LEISURE_CATEGORIES);
  const subs = subscriptionsTotal(state);

  const total = housing + food + leisure + subs;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return [
    { key: "housing", label: "Housing", icon: "🏠", color: "#a78bfa", amount: housing, pct: pct(housing) },
    { key: "food", label: "Food & Dining", icon: "🍔", color: "#34d399", amount: food, pct: pct(food) },
    { key: "leisure", label: "Lifestyle & Leisure", icon: "☕", color: "#ffb020", amount: leisure, pct: pct(leisure) },
    { key: "subscriptions", label: "Subscriptions & Bills", icon: "⚡", color: "#ff6f61", amount: subs, pct: pct(subs) },
  ];
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function spendBreakdownTotal(state: FinanceState): number {
  return totalMonthlyOutflow(state) + spentThisMonth(state);
}
