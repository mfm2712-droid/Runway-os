export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "shopping"
  | "health"
  | "entertainment"
  | "other";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewsOn: number; // day of month, 1-31
  flaggedUnused: boolean;
  flaggedSince?: string; // ISO date — set when flaggedUnused becomes true
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  reason: string;
  addedAt: string; // ISO timestamp
}

export type Currency = "GBP" | "EUR" | "USD";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  GBP: "British Pound",
  EUR: "Euro",
  USD: "US Dollar",
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
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "Food & Drink",
  transport: "Transport",
  housing: "Housing",
  shopping: "Shopping",
  health: "Health",
  entertainment: "Entertainment",
  other: "Other",
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: "🍔",
  transport: "🚕",
  housing: "🏠",
  shopping: "🛍️",
  health: "💊",
  entertainment: "🎬",
  other: "•••",
};
