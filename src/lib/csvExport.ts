import { CATEGORY_LABELS } from "../types";
import type { FinanceState } from "../types";

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Renews-on day (1-31) reframed as an approximate next-renewal date for the export. */
function nextRenewalDate(renewsOn: number, today: Date = new Date()): string {
  let target = new Date(today.getFullYear(), today.getMonth(), renewsOn);
  if (target < today) target = new Date(today.getFullYear(), today.getMonth() + 1, renewsOn);
  return target.toISOString().slice(0, 10);
}

export function buildExpensesCsv(state: FinanceState): string {
  const header = ["Date", "Category", "Merchant/Note", "Amount", "Currency", "Type"];
  const rows: string[][] = [];

  for (const e of state.expenses) {
    rows.push([
      e.date,
      CATEGORY_LABELS[e.category],
      e.note ?? "",
      e.amount.toFixed(2),
      state.currency,
      "Expense",
    ]);
  }
  for (const s of state.subscriptions) {
    rows.push([
      nextRenewalDate(s.renewsOn),
      "Subscriptions & Bills",
      s.name,
      s.amount.toFixed(2),
      state.currency,
      "Recurring",
    ]);
  }

  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadExpensesCsv(state: FinanceState): void {
  const csv = buildExpensesCsv(state);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `runway-os-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
