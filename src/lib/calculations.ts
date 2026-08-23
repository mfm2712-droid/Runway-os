import type { Currency, FinanceState } from "../types";

export function daysLeftInMonth(today: Date = new Date()): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate() + 1;
}

/** Days until the next occurrence of `dayOfMonth`, inclusive of today. */
export function daysUntilDayOfMonth(dayOfMonth: number, today: Date = new Date()): number {
  let target = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (target < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    target = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  }
  const diffMs = target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(1, Math.round(diffMs / 86400000) + 1);
}

/** The spreading horizon for Daily Safe Spend: to payday if configured, else calendar month-end. */
export function spendingHorizonDays(state: FinanceState, today: Date = new Date()): number {
  if (state.paydayDay) return daysUntilDayOfMonth(state.paydayDay, today);
  return daysLeftInMonth(today);
}

export function subscriptionsTotal(state: FinanceState): number {
  return state.subscriptions.reduce((sum, s) => sum + s.amount, 0);
}

export function unusedSubscriptionsTotal(state: FinanceState): number {
  return state.subscriptions
    .filter((s) => s.flaggedUnused)
    .reduce((sum, s) => sum + s.amount, 0);
}

export function totalMonthlyOutflow(state: FinanceState): number {
  return state.fixedMonthlyOutflows + subscriptionsTotal(state);
}

export function spentInMonth(state: FinanceState, year: number, month: number): number {
  return state.expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function spentThisMonth(state: FinanceState, today: Date = new Date()): number {
  return spentInMonth(state, today.getFullYear(), today.getMonth());
}

/** Sum of logged expenses dated exactly `dateISO` (YYYY-MM-DD). */
export function dailySpend(state: FinanceState, dateISO: string): number {
  return state.expenses
    .filter((e) => e.date === dateISO)
    .reduce((sum, e) => sum + e.amount, 0);
}

function hasDataInMonth(state: FinanceState, year: number, month: number): boolean {
  return state.expenses.some((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/**
 * % change in total monthly footprint (fixed outflows + subscriptions +
 * logged expenses) vs the previous calendar month. Fixed outflows and
 * subscriptions are treated as constant across both months (this app has no
 * historical record of them), so the delta is really driven by the change
 * in logged expenses — returns null when the previous month has no logged
 * expenses at all, since there's nothing real to compare against yet.
 */
export function monthOverMonthDelta(state: FinanceState, today: Date = new Date()): number | null {
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();
  if (!hasDataInMonth(state, prevYear, prevMonth)) return null;

  const recurring = state.fixedMonthlyOutflows + subscriptionsTotal(state);
  const currentTotal = recurring + spentThisMonth(state, today);
  const previousTotal = recurring + spentInMonth(state, prevYear, prevMonth);
  if (previousTotal <= 0) return null;
  return ((currentTotal - previousTotal) / previousTotal) * 100;
}

/** Worst-case runway: months until cash truly hits zero at zero income. Not reduced by the safety buffer — that's what Daily Safe Spend is for. */
export function runwayMonths(state: FinanceState): number {
  const burn = totalMonthlyOutflow(state);
  if (burn <= 0) return Infinity;
  return state.cashBalance / burn;
}

const WEEKEND_WEIGHT = 1.4;

function isWeekendDay(d: Date): boolean {
  const dow = d.getDay(); // 0 = Sun ... 6 = Sat
  return dow === 0 || dow === 5 || dow === 6; // Fri, Sat, Sun
}

/** Weekday vs weekend-day counts across the next `days` days, starting today. */
function countWeekendWeightedDays(days: number, today: Date): { weekdays: number; weekendDays: number } {
  let weekdays = 0;
  let weekendDays = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (isWeekendDay(d)) weekendDays++;
    else weekdays++;
  }
  return { weekdays, weekendDays };
}

export function dailySafeSpend(state: FinanceState, today: Date = new Date()): number {
  const remaining = Math.max(
    0,
    state.cashBalance -
      totalMonthlyOutflow(state) -
      spentThisMonth(state, today) -
      (state.safetyBuffer || 0),
  );
  const days = spendingHorizonDays(state, today);

  if (!state.weekendBooster) return remaining / days;

  // Same total budget, redistributed so Fri-Sun gets 1.4x the daily share of
  // Mon-Thu — today's allowance depends on both what kind of day today is
  // and the weekday/weekend mix still remaining in the horizon.
  const { weekdays, weekendDays } = countWeekendWeightedDays(days, today);
  const weightedDays = weekdays + weekendDays * WEEKEND_WEIGHT;
  if (weightedDays <= 0) return 0;
  const base = remaining / weightedDays;
  return base * (isWeekendDay(today) ? WEEKEND_WEIGHT : 1);
}

/**
 * True when more than `threshold` of the month's discretionary budget has
 * already been spent within the first `withinDays` days of the cycle — an
 * early warning that the daily allowance is about to get squeezed.
 */
export function isBurnSpike(
  state: FinanceState,
  today: Date = new Date(),
  threshold = 0.45,
  withinDays = 10,
): boolean {
  if (today.getDate() > withinDays) return false;
  const spent = spentThisMonth(state, today);
  const budgetAtCycleStart = state.cashBalance + spent - totalMonthlyOutflow(state) - (state.safetyBuffer || 0);
  if (budgetAtCycleStart <= 0) return false;
  return spent / budgetAtCycleStart > threshold;
}

export function formatCurrency(amount: number, currency: Currency = "GBP"): string {
  if (!Number.isFinite(amount)) return "∞";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMonths(months: number): string {
  if (!Number.isFinite(months)) return "∞";
  return months.toFixed(1);
}

/** Runway display for the headline stat: months normally, years past a year, ∞/Sustainable at zero burn. */
export function formatRunwayDisplay(
  months: number,
  sustainableLabel = "Sustainable",
): { value: string; unit: string } {
  if (!Number.isFinite(months)) return { value: "∞", unit: sustainableLabel };
  if (months > 12) return { value: (months / 12).toFixed(1), unit: "yr" };
  return { value: months.toFixed(1), unit: "mo" };
}
