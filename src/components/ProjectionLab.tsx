import { useMemo, useState } from "react";
import type { Currency, FinanceState } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { formatCurrency, subscriptionsTotal, totalMonthlyOutflow } from "../lib/calculations";
import {
  SCENARIO_PRESETS,
  defaultScenario,
  freedomDateLabel,
  monthsToZero,
  projectBalances,
  type ScenarioInput,
} from "../lib/projection";
import { GlassCard } from "./ui/GlassCard";
import { PremiumSlider } from "./ui/PremiumSlider";
import { PencilIcon } from "./ui/Icons";
import { BurnProjectionChart } from "./BurnProjectionChart";

function ScenarioField({
  label,
  value,
  min,
  max,
  step,
  color,
  currency,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  currency: Currency;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2.5">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-[10px] text-sky-400">editing exact value</span>
        </div>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
        />
      </div>
    );
  }

  return (
    <div onDoubleClick={() => setEditing(true)}>
      <PremiumSlider
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        format={(v) => formatCurrency(v, currency)}
        color={color}
      />
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] text-slate-400 hover:text-slate-300 mt-1.5 transition-colors"
      >
        enter exact amount →
      </button>
    </div>
  );
}

export function ProjectionLab({
  state,
  onApply,
}: {
  state: FinanceState;
  onApply: (patch: Partial<FinanceState>) => void;
}) {
  const initialBurn = totalMonthlyOutflow(state);
  const [sandbox, setSandbox] = useState<ScenarioInput>(() => defaultScenario(state, initialBurn));
  const [applied, setApplied] = useState(false);
  const [sideHustleAmount, setSideHustleAmount] = useState(600);
  const [editingAmount, setEditingAmount] = useState(false);

  const points = useMemo(() => projectBalances(sandbox, 12), [sandbox]);
  const zeroMonth = useMemo(() => monthsToZero(sandbox), [sandbox]);
  const runwayMonthsValue = zeroMonth ?? Infinity;
  const sustainable = zeroMonth === null;

  const dirty =
    sandbox.cash !== state.cashBalance || sandbox.burn !== initialBurn || sandbox.income !== 0;

  const reset = () => setSandbox(defaultScenario(state, initialBurn));

  const apply = () => {
    const realFixed = Math.max(0, sandbox.burn - subscriptionsTotal(state));
    onApply({ cashBalance: sandbox.cash, fixedMonthlyOutflows: realFixed });
    setApplied(true);
    window.setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">Quick Scenarios</h4>
          {dirty && (
            <button onClick={reset} className="text-[10px] text-slate-500 hover:text-slate-300">
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {SCENARIO_PRESETS.map((preset) =>
            preset.editableAmount ? (
              <div
                key={preset.id}
                className="shrink-0 flex items-stretch rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden"
              >
                <button
                  onClick={() => setSandbox(preset.apply(state, sandbox, sideHustleAmount))}
                  title={preset.description}
                  className="text-xs font-medium px-3.5 py-2.5 text-slate-200 active:scale-[0.96] transition-all whitespace-nowrap"
                  style={{ transitionTimingFunction: "var(--ease-spring)" }}
                >
                  🚀 +{formatCurrency(sideHustleAmount, state.currency)} {preset.editableAmount.suffix}
                </button>
                <button
                  onClick={() => setEditingAmount((v) => !v)}
                  aria-label="Edit side hustle amount"
                  className={`px-2.5 flex items-center border-l border-white/[0.08] transition-colors ${
                    editingAmount ? "text-sky-400 bg-white/[0.04]" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <PencilIcon width={13} height={13} />
                </button>
              </div>
            ) : (
              <button
                key={preset.id}
                onClick={() => setSandbox(preset.apply(state, sandbox))}
                title={preset.description}
                className="shrink-0 text-xs font-medium px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-200 hover:border-violet-400/30 active:scale-[0.96] transition-all whitespace-nowrap"
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                {preset.label}
              </button>
            ),
          )}
        </div>

        {editingAmount && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-[floatIn_0.2s_var(--ease-spring)]">
            <span className="text-lg text-slate-500">{CURRENCY_SYMBOLS[state.currency]}</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={sideHustleAmount}
              onChange={(e) => setSideHustleAmount(Number(e.target.value) || 0)}
              className="flex-1 bg-transparent text-sm font-semibold tracking-tight tabular-nums text-white focus:outline-none"
            />
            {[300, 600, 1200].map((v) => (
              <button
                key={v}
                onClick={() => setSideHustleAmount(v)}
                className={`text-[10px] px-2.5 py-1.5 rounded-full border transition-colors ${
                  sideHustleAmount === v
                    ? "border-sky-400/50 text-sky-300 bg-sky-400/10"
                    : "border-white/[0.08] text-slate-500"
                }`}
              >
                +{CURRENCY_SYMBOLS[state.currency]}{v}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard
        className={`relative overflow-hidden p-5 space-y-1 border ${
          sustainable ? "border-emerald-500/25" : "border-rose-500/25"
        }`}
      >
        <div className="mesh-glow opacity-40" />
        <p className="relative text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Freedom Milestone
        </p>
        <p className="relative text-lg font-bold tracking-tight tabular-nums text-white">
          Runway: {Number.isFinite(runwayMonthsValue) ? runwayMonthsValue.toFixed(1) : "∞"} mo
          <span className="text-slate-500 font-normal"> • </span>
          <span className={sustainable ? "text-emerald-400" : "text-rose-400"}>
            {sustainable ? "Sustainable" : `Zero cash: ${freedomDateLabel(zeroMonth)}`}
          </span>
        </p>
      </GlassCard>

      <GlassCard className="p-5">
        <BurnProjectionChart points={points} zeroMonth={zeroMonth} currency={state.currency} />
      </GlassCard>

      <GlassCard className="p-6 space-y-7">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">Projection Lab</h4>
          <span className="text-[10px] text-slate-500">drag to simulate</span>
        </div>

        <ScenarioField
          label="Liquid Cash"
          value={sandbox.cash}
          min={0}
          max={50000}
          step={50}
          color="#38bdf8"
          currency={state.currency}
          onChange={(v) => setSandbox((s) => ({ ...s, cash: v }))}
        />

        <ScenarioField
          label="Fixed Burn (incl. subscriptions)"
          value={sandbox.burn}
          min={0}
          max={10000}
          step={10}
          color="#fb7185"
          currency={state.currency}
          onChange={(v) => setSandbox((s) => ({ ...s, burn: v }))}
        />

        <ScenarioField
          label="Expected Monthly Income"
          value={sandbox.income}
          min={0}
          max={8000}
          step={50}
          color="#34d399"
          currency={state.currency}
          onChange={(v) => setSandbox((s) => ({ ...s, income: v }))}
        />

        <div className="space-y-2">
          <button
            onClick={apply}
            disabled={!dirty && !applied}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-sky-400 to-emerald-400 text-obsidian-950 disabled:opacity-30 active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {applied ? "✓ Applied to your real numbers" : "Apply Cash & Burn to my real numbers"}
          </button>
          <p className="text-[10px] text-slate-400 text-center">
            Income is exploratory only — Runway OS doesn't track income elsewhere, so it's never saved.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
