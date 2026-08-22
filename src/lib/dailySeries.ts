import type { FinanceState } from "../types";
import { dailySafeSpend, dailySpend } from "./calculations";

export interface DaySeriesEntry {
  date: string; // YYYY-MM-DD
  spent: number;
  safeSpend: number;
}

export type DailySeries = DaySeriesEntry[];

const MAX_DAYS = 30;

function toISODate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/**
 * Upserts today's entry (spend so far, current Daily Safe Spend) into the
 * series and trims to the last 30 days. Called on app open and after every
 * expense add, so today's bar stays live as the day progresses while past
 * days stay frozen once their date has passed.
 */
export function upsertToday(series: DailySeries, state: FinanceState, today: Date = new Date()): DailySeries {
  const date = toISODate(today);
  const entry: DaySeriesEntry = {
    date,
    spent: dailySpend(state, date),
    safeSpend: dailySafeSpend(state, today),
  };
  const withoutToday = series.filter((e) => e.date !== date);
  return [...withoutToday, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS);
}
