export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "shopping"
  | "health"
  | "entertainment"
  | "other"
  | "bills"
  | "bnpl";

export type BnplPlan = "2w" | "4w" | "1m" | "3m" | "6m";

export const BNPL_PLAN_LABELS: Record<BnplPlan, string> = {
  "2w": "2 weeks",
  "4w": "4 weeks",
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
};

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  note?: string;
  bnplPlan?: BnplPlan; // set when category is "bnpl" — the repayment plan chosen at purchase
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewsOn: number; // day of month, 1-31
  flaggedUnused: boolean;
  flaggedSince?: string; // ISO date — set when flaggedUnused becomes true
  expiresOn?: string; // YYYY-MM-DD — when set, the sub is excluded from active totals/runway once past this date; absent means it auto-renews indefinitely
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  reason: string;
  addedAt: string; // ISO timestamp
}

export type Currency = "GBP" | "EUR" | "USD" | "CHF";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  CHF: "CHF",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  GBP: "British Pound",
  EUR: "Euro",
  USD: "US Dollar",
  CHF: "Swiss Franc",
};

export interface FinanceState {
  cashBalance: number;
  fixedMonthlyOutflows: number;
  subscriptions: Subscription[];
  expenses: Expense[];
  wishlist: WishlistItem[];
  paydayDay?: number; // day of month, 1-31 — when set, spending horizon runs to payday instead of month-end
  safetyBuffer: number; // kept aside, excluded from Daily Safe Spend
  currency: Currency;
  weekendBooster?: boolean; // when true, Daily Safe Spend weights Fri-Sun 1.4x vs Mon-Thu
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "Food & Drink",
  transport: "Transport",
  housing: "Housing",
  shopping: "Shopping",
  health: "Health",
  entertainment: "Entertainment",
  other: "Other",
  bills: "Bills",
  bnpl: "Buy Now Pay Later",
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: "🍔",
  transport: "🚕",
  housing: "🏠",
  shopping: "🛍️",
  health: "💊",
  entertainment: "🎬",
  other: "•••",
  bills: "🧾",
  bnpl: "💳",
};
