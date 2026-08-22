import type { FinanceState } from "../types";
import { dailySafeSpend, dailySpend } from "./calculations";

export interface StreakData {
  count: number;
  /** Most recently evaluated calendar day (YYYY-MM-DD) — safe or not — used
   * to avoid judging the same day twice, not necessarily a day that
   * extended the streak. */
  lastSafeDate: string | null;
}

export const BLANK_STREAK: StreakData = { count: 0, lastSafeDate: null };

function toISODate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function addDays(dateISO: string, n: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

const MAX_BACKFILL_DAYS = 60;

/**
 * Advances the safe-spend streak by judging every completed calendar day
 * between the last-evaluated date (exclusive) and today (exclusive) — never
 * today itself, since it isn't over yet. A day counts as "safe" when that
 * day's logged expenses (never pro-rata fixed costs/subscriptions, which
 * are already netted into dailySafeSpend's remaining-budget math) stay
 * within that day's Daily Safe Spend allowance.
 *
 * Caveat: this app keeps no historical snapshot of cash balance or fixed
 * costs, so dailySafeSpend for a past day is computed against *today's*
 * balance and settings applied retroactively — an approximation inherent
 * to the local-first, no-ledger design, not a precise replay of that day.
 */
export function updateStreak(
  state: FinanceState,
  prev: StreakData = BLANK_STREAK,
  today: Date = new Date(),
): StreakData {
  const todayISO = toISODate(today);
  const floor = addDays(todayISO, -MAX_BACKFILL_DAYS);
  // No history yet (first run) or a very stale entry (app unopened for
  // months) both resume from the same recent floor, rather than either
  // looping for a long time or — the actual first-run bug this guards
  // against — starting at today and never evaluating any day at all.
  let cursor = prev.lastSafeDate ? addDays(prev.lastSafeDate, 1) : floor;
  if (cursor < floor) cursor = floor;

  let count = prev.count;
  let lastSafeDate = prev.lastSafeDate;

  while (cursor < todayISO) {
    const spent = dailySpend(state, cursor);
    const safeLimit = dailySafeSpend(state, new Date(`${cursor}T12:00:00`));
    count = spent <= safeLimit ? count + 1 : 0;
    lastSafeDate = cursor;
    cursor = addDays(cursor, 1);
  }

  return { count, lastSafeDate };
}
