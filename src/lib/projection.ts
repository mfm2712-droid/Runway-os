import type { FinanceState } from "../types";
import { DICTIONARIES, EN, type Lang } from "./i18n/translations";

export interface ScenarioInput {
  cash: number;
  burn: number; // total monthly burn, fixed costs + subscriptions
  income: number; // hypothetical monthly income — not tracked elsewhere in the app
}

export interface ProjectionPoint {
  month: number; // 0..horizon
  balance: number;
}

export function defaultScenario(state: FinanceState, burn: number): ScenarioInput {
  return { cash: state.cashBalance, burn, income: 0 };
}

/** Straight-line projection: net = income - burn applied per month. */
export function projectBalances(input: ScenarioInput, horizonMonths = 12): ProjectionPoint[] {
  const net = input.income - input.burn;
  const points: ProjectionPoint[] = [];
  for (let m = 0; m <= horizonMonths; m++) {
    points.push({ month: m, balance: input.cash + net * m });
  }
  return points;
}

/** Fractional months until balance hits zero, or null if income covers burn (sustainable). */
export function monthsToZero(input: ScenarioInput): number | null {
  const net = input.income - input.burn;
  if (net >= 0) return null;
  if (input.cash <= 0) return 0;
  return input.cash / -net;
}

export function freedomDateLabel(monthsFromNow: number | null, lang: Lang = "en"): string {
  if (monthsFromNow === null) return DICTIONARIES[lang]["projection.sustainableLabel"];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.round(monthsFromNow));
  return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", { month: "short", year: "numeric" });
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  /** When set, this preset's amount is user-editable (pencil icon) and formats into the label. */
  editableAmount?: { default: number; suffix: string };
  apply: (state: FinanceState, sandbox: ScenarioInput, amount?: number) => ScenarioInput;
}

export function getScenarioPresets(lang: Lang = "en"): ScenarioPreset[] {
  const t = (key: string) => DICTIONARIES[lang][key] ?? EN[key] ?? key;
  return [
    {
      id: "zero-income",
      label: t("projection.presetZeroIncome"),
      description: t("projection.presetZeroIncomeDesc"),
      apply: (_state, sandbox) => ({ ...sandbox, income: 0 }),
    },
    {
      id: "aggressive-cut",
      label: t("projection.presetAggressiveCut"),
      description: t("projection.presetAggressiveCutDesc"),
      apply: (_state, sandbox) => ({ ...sandbox, burn: Math.max(0, sandbox.burn * 0.7) }),
    },
    {
      id: "side-hustle",
      label: t("projection.presetSideHustle"),
      description: t("projection.presetSideHustleDesc"),
      editableAmount: { default: 600, suffix: t("projection.presetSideHustleSuffix") },
      apply: (_state, sandbox, amount) => ({ ...sandbox, income: sandbox.income + (amount ?? 600) }),
    },
  ];
}
