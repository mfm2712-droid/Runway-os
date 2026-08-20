import type { FinanceState } from "../types";
import { spendingHorizonDays, totalMonthlyOutflow } from "./calculations";

export const COOLDOWN_HOURS = 72;

export function msRemaining(addedAt: string, now: number = Date.now()): number {
  const unlockAt = new Date(addedAt).getTime() + COOLDOWN_HOURS * 60 * 60 * 1000;
  return Math.max(0, unlockAt - now);
}

export function isExpired(addedAt: string, now: number = Date.now()): boolean {
  return msRemaining(addedAt, now) <= 0;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Unlocked";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** How many days of runway this one-off purchase would cost, given current burn. */
export function runwayDaysCost(price: number, state: FinanceState): number {
  const burn = totalMonthlyOutflow(state);
  if (burn <= 0) return 0;
  return (price / burn) * 30;
}

/** How much this purchase would lower today's daily safe spend by, if bought now. */
export function dailyLimitImpact(price: number, state: FinanceState): number {
  return price / spendingHorizonDays(state);
}
