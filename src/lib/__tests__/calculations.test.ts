import { describe, expect, it } from "vitest";
import type { Currency, Expense, FinanceState } from "../../types";
import { CURRENCY_LABELS, CURRENCY_SYMBOLS } from "../../types";
import { dailySafeSpend, formatCurrency, isBurnSpike, runwayMonths } from "../calculations";
import { projectBalances, monthsToZero, type ScenarioInput } from "../projection";
import { computeTrialStatus, TRIAL_HOURS } from "../trial";

function buildState(overrides: Partial<FinanceState> = {}): FinanceState {
  return {
    cashBalance: 4000,
    fixedMonthlyOutflows: 1200,
    safetyBuffer: 0,
    paydayDay: undefined,
    currency: "GBP",
    subscriptions: [],
    expenses: [],
    wishlist: [],
    ...overrides,
  };
}

function expenseThisMonth(amount: number, today: Date): Expense {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return { id: "e1", amount, category: "other", date: `${y}-${m}-15` };
}

describe("formatCurrency", () => {
  it("formats GBP, EUR, USD and CHF with the correct currency indicator", () => {
    expect(formatCurrency(1234.5, "GBP")).toBe("£1,234.50");
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
    expect(formatCurrency(1234.5, "USD")).toBe("US$1,234.50");
    expect(formatCurrency(1234.5, "CHF")).toBe("CHF 1,234.50");
  });

  it("handles zero and negative amounts in CHF", () => {
    expect(formatCurrency(0, "CHF")).toBe("CHF 0.00");
    expect(formatCurrency(-50, "CHF")).toBe("-CHF 50.00");
  });

  it("returns the infinity symbol for non-finite amounts regardless of currency", () => {
    expect(formatCurrency(Infinity, "CHF")).toBe("∞");
    expect(formatCurrency(NaN, "CHF")).toBe("∞");
  });

  it("defines a symbol and label for every supported currency, including CHF", () => {
    const currencies: Currency[] = ["GBP", "EUR", "USD", "CHF"];
    for (const c of currencies) {
      expect(CURRENCY_SYMBOLS[c]).toBeTruthy();
      expect(CURRENCY_LABELS[c]).toBeTruthy();
    }
    expect(CURRENCY_SYMBOLS.CHF).toBe("CHF");
    expect(CURRENCY_LABELS.CHF).toBe("Swiss Franc");
  });
});

describe("dailySafeSpend", () => {
  it("divides the remaining budget evenly across the horizon without weekendBooster", () => {
    const today = new Date(2024, 0, 1); // Monday, 31 days left in January
    const state = buildState({
      cashBalance: 4000,
      fixedMonthlyOutflows: 1200,
      subscriptions: [{ id: "s1", name: "Subs", amount: 60, renewsOn: 1, flaggedUnused: false }],
    });
    // remaining = 4000 - 1260 = 2740, horizon = 31 days
    expect(dailySafeSpend(state, today)).toBeCloseTo(2740 / 31, 6);
  });

  it("never goes negative when outflow exceeds cash", () => {
    const today = new Date(2024, 0, 1);
    const state = buildState({ cashBalance: 100, fixedMonthlyOutflows: 5000 });
    expect(dailySafeSpend(state, today)).toBe(0);
  });

  it("is unaffected by which currency the state is denominated in (CHF vs GBP)", () => {
    const today = new Date(2024, 0, 1);
    const gbpState = buildState({ cashBalance: 4000, fixedMonthlyOutflows: 1200, currency: "GBP" });
    const chfState = buildState({ cashBalance: 4000, fixedMonthlyOutflows: 1200, currency: "CHF" });
    expect(dailySafeSpend(chfState, today)).toBe(dailySafeSpend(gbpState, today));
    expect(runwayMonths(chfState)).toBe(runwayMonths(gbpState));
  });

  it("subtracts the safety buffer from what's available", () => {
    const today = new Date(2024, 0, 1);
    const withoutBuffer = buildState({ cashBalance: 4000, fixedMonthlyOutflows: 1200, safetyBuffer: 0 });
    const withBuffer = buildState({ cashBalance: 4000, fixedMonthlyOutflows: 1200, safetyBuffer: 500 });
    expect(dailySafeSpend(withBuffer, today)).toBeCloseTo(dailySafeSpend(withoutBuffer, today) - 500 / 31, 6);
  });

  it("weekendBooster shifts allowance away from a weekday within a mixed horizon", () => {
    // Monday Jan 1 2024, payday on the 7th -> 7-day horizon: Mon-Thu (4 weekdays), Fri-Sun (3 weekend days)
    const today = new Date(2024, 0, 1);
    const base = buildState({
      cashBalance: 4000,
      fixedMonthlyOutflows: 1200,
      subscriptions: [{ id: "s1", name: "Subs", amount: 60, renewsOn: 1, flaggedUnused: false }],
      paydayDay: 7,
    });
    const unboosted = dailySafeSpend(base, today);
    const boosted = dailySafeSpend({ ...base, weekendBooster: true }, today);

    expect(unboosted).toBeCloseTo(2740 / 7, 6);
    expect(boosted).toBeCloseTo(2740 / 8.2, 6); // weighted days = 4*1 + 3*1.4
    expect(boosted).toBeLessThan(unboosted);
  });

  it("weekendBooster shifts allowance toward a weekend day within a mixed horizon", () => {
    // Friday Jan 5 2024, payday on the 11th -> 7-day horizon: Fri-Sun (3 weekend), Mon-Thu (4 weekdays)
    const today = new Date(2024, 0, 5);
    const base = buildState({
      cashBalance: 4000,
      fixedMonthlyOutflows: 1200,
      subscriptions: [{ id: "s1", name: "Subs", amount: 60, renewsOn: 1, flaggedUnused: false }],
      paydayDay: 11,
    });
    const unboosted = dailySafeSpend(base, today);
    const boosted = dailySafeSpend({ ...base, weekendBooster: true }, today);

    expect(unboosted).toBeCloseTo(2740 / 7, 6);
    expect(boosted).toBeCloseTo((2740 / 8.2) * 1.4, 6);
    expect(boosted).toBeGreaterThan(unboosted);
  });

  it("weekendBooster has no effect when every day in the horizon is a weekday", () => {
    // Monday Jan 1 2024, payday on the 4th -> 4-day horizon: Mon, Tue, Wed, Thu (all weekdays)
    const today = new Date(2024, 0, 1);
    const base = buildState({ cashBalance: 4000, fixedMonthlyOutflows: 1200, paydayDay: 4 });
    const unboosted = dailySafeSpend(base, today);
    const boosted = dailySafeSpend({ ...base, weekendBooster: true }, today);
    expect(boosted).toBeCloseTo(unboosted, 6);
  });
});

describe("runwayMonths", () => {
  it("computes cash / total monthly outflow for a normal burn rate", () => {
    const state = buildState({
      cashBalance: 6000,
      fixedMonthlyOutflows: 1000,
      subscriptions: [{ id: "s1", name: "Subs", amount: 500, renewsOn: 1, flaggedUnused: false }],
    });
    expect(runwayMonths(state)).toBe(4);
  });

  it("returns Infinity at zero burn", () => {
    const state = buildState({ cashBalance: 6000, fixedMonthlyOutflows: 0, subscriptions: [] });
    expect(runwayMonths(state)).toBe(Infinity);
  });

  it("is not reduced by the safety buffer (that's what Daily Safe Spend is for)", () => {
    const withoutBuffer = buildState({ cashBalance: 6000, fixedMonthlyOutflows: 1000, safetyBuffer: 0 });
    const withBuffer = buildState({ cashBalance: 6000, fixedMonthlyOutflows: 1000, safetyBuffer: 2000 });
    expect(runwayMonths(withBuffer)).toBe(runwayMonths(withoutBuffer));
  });
});

describe("isBurnSpike", () => {
  it("flags when over the threshold is burned within the first withinDays", () => {
    const today = new Date(2024, 0, 5); // day 5, within first 10 days
    const state = buildState({
      cashBalance: 800,
      fixedMonthlyOutflows: 0,
      expenses: [expenseThisMonth(700, today)],
    });
    // budgetAtCycleStart = 800 + 700 = 1500; spent 700 / 1500 = 0.4667 > 0.45
    expect(isBurnSpike(state, today)).toBe(true);
  });

  it("does not flag below the threshold", () => {
    const today = new Date(2024, 0, 5);
    const state = buildState({
      cashBalance: 1300,
      fixedMonthlyOutflows: 0,
      expenses: [expenseThisMonth(200, today)],
    });
    // budgetAtCycleStart = 1300 + 200 = 1500; spent 200 / 1500 = 0.133
    expect(isBurnSpike(state, today)).toBe(false);
  });

  it("is strict at the exact threshold boundary", () => {
    const today = new Date(2024, 0, 5);
    const atBoundary = buildState({
      cashBalance: 550,
      fixedMonthlyOutflows: 0,
      expenses: [expenseThisMonth(450, today)],
    });
    // budget = 550 + 450 = 1000; 450/1000 = 0.45 exactly -> not > threshold
    expect(isBurnSpike(atBoundary, today)).toBe(false);

    const overBoundary = buildState({
      cashBalance: 549,
      fixedMonthlyOutflows: 0,
      expenses: [expenseThisMonth(451, today)],
    });
    expect(isBurnSpike(overBoundary, today)).toBe(true);
  });

  it("never flags after the first withinDays days of the cycle", () => {
    const today = new Date(2024, 0, 15); // past day 10
    const state = buildState({
      cashBalance: 100,
      fixedMonthlyOutflows: 0,
      expenses: [expenseThisMonth(900, today)],
    });
    expect(isBurnSpike(state, today)).toBe(false);
  });

  it("never flags when the discretionary budget is zero or negative", () => {
    const today = new Date(2024, 0, 5);
    const state = buildState({ cashBalance: 0, fixedMonthlyOutflows: 1000, expenses: [] });
    expect(isBurnSpike(state, today)).toBe(false);
  });
});

describe("projectBalances", () => {
  it("projects a straight-line balance for a net burn", () => {
    const input: ScenarioInput = { cash: 1000, burn: 200, income: 0 };
    const points = projectBalances(input, 3);
    expect(points).toEqual([
      { month: 0, balance: 1000 },
      { month: 1, balance: 800 },
      { month: 2, balance: 600 },
      { month: 3, balance: 400 },
    ]);
  });

  it("projects a growing balance when income exceeds burn", () => {
    const input: ScenarioInput = { cash: 1000, burn: 200, income: 500 };
    const points = projectBalances(input, 2);
    expect(points).toEqual([
      { month: 0, balance: 1000 },
      { month: 1, balance: 1300 },
      { month: 2, balance: 1600 },
    ]);
  });
});

describe("monthsToZero", () => {
  it("returns null when income covers burn (sustainable)", () => {
    expect(monthsToZero({ cash: 1000, burn: 200, income: 300 })).toBeNull();
  });

  it("returns null when income exactly matches burn", () => {
    expect(monthsToZero({ cash: 1000, burn: 200, income: 200 })).toBeNull();
  });

  it("computes fractional months until zero for a net burn", () => {
    expect(monthsToZero({ cash: 1000, burn: 500, income: 0 })).toBe(2);
  });

  it("returns 0 immediately when cash is already at or below zero", () => {
    expect(monthsToZero({ cash: 0, burn: 500, income: 0 })).toBe(0);
    expect(monthsToZero({ cash: -100, burn: 500, income: 0 })).toBe(0);
  });
});

describe("computeTrialStatus", () => {
  it("dev override takes precedence over everything else", () => {
    expect(computeTrialStatus("", "cus_123", "pro")).toEqual({ kind: "pro" });
    expect(computeTrialStatus("", null, "expired")).toEqual({ kind: "expired" });
    expect(computeTrialStatus("", null, "trial")).toEqual({ kind: "trial", hoursLeft: TRIAL_HOURS - 1 });
  });

  it("a truthy licenseKey grants pro regardless of trial timing", () => {
    const longAgo = new Date(Date.now() - 1000 * 3600 * 1000).toISOString();
    expect(computeTrialStatus(longAgo, "cus_123", null)).toEqual({ kind: "pro" });
  });

  it("an empty trialStartedAt is a fresh, full trial that hasn't started ticking", () => {
    expect(computeTrialStatus("", null, null)).toEqual({ kind: "trial", hoursLeft: TRIAL_HOURS });
  });

  it("counts down hoursLeft as time elapses", () => {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const status = computeTrialStatus(oneHourAgo, null, null);
    expect(status.kind).toBe("trial");
    if (status.kind === "trial") expect(status.hoursLeft).toBeCloseTo(TRIAL_HOURS - 1, 1);
  });

  it("expires once TRIAL_HOURS have elapsed", () => {
    const wellPastTrial = new Date(Date.now() - (TRIAL_HOURS + 1) * 3600_000).toISOString();
    expect(computeTrialStatus(wellPastTrial, null, null)).toEqual({ kind: "expired" });
  });
});
