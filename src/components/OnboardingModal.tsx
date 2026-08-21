import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Currency } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { backdropVariants, panelVariants } from "../lib/motionPresets";

export interface OnboardingResult {
  cashBalance: number;
  fixedMonthlyOutflows: number;
  paydayDay: number;
}

export function OnboardingModal({
  open,
  currency,
  onComplete,
  onLoadDemo,
}: {
  open: boolean;
  currency: Currency;
  onComplete: (result: OnboardingResult) => void;
  onLoadDemo: () => void;
}) {
  const [step, setStep] = useState(1);
  const [cash, setCash] = useState("");
  const [outflows, setOutflows] = useState("");
  const [paydayDay, setPaydayDay] = useState("28");
  const reduceMotion = useReducedMotion();

  const sym = CURRENCY_SYMBOLS[currency];

  const stepValid =
    step === 1 ? cash.trim() !== "" && Number(cash) >= 0
    : step === 2 ? outflows.trim() !== "" && Number(outflows) >= 0
    : true;

  const back = () => setStep((s) => Math.max(1, s - 1));

  const advance = () => {
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    onComplete({
      cashBalance: Number(cash) || 0,
      fixedMonthlyOutflows: Number(outflows) || 0,
      paydayDay: Math.min(31, Math.max(1, Number(paydayDay) || 28)),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-7"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Runway OS"
          >
        <div className="mesh-glow opacity-60" />

        <div className="relative flex items-center justify-center gap-1.5">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-sky-400" : i < step ? "w-1.5 bg-sky-400/50" : "w-1.5 bg-white/[0.15]"
              }`}
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
            />
          ))}
        </div>

        <div className="relative text-center space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
            Step {step} of 3
          </p>
          <h2 className="text-lg font-bold text-white leading-snug px-2">
            {step === 1 && "What's your total liquid cash today?"}
            {step === 2 && "Core monthly fixed outflows?"}
            {step === 3 && "What day of the month do you get paid?"}
          </h2>
        </div>

        <div className="relative" key={step} style={{ animation: "floatIn 0.25s var(--ease-spring)" }}>
          {step === 1 && (
            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 focus-within:border-sky-500 transition-colors">
              <span className="text-2xl text-slate-500 mr-1">{sym}</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && stepValid && advance()}
                className="w-full bg-transparent text-3xl font-bold tracking-tight text-white tabular-nums focus:outline-none glow-text"
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 focus-within:border-sky-500 transition-colors">
              <span className="text-2xl text-slate-500 mr-1">{sym}</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={outflows}
                onChange={(e) => setOutflows(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && stepValid && advance()}
                className="w-full bg-transparent text-3xl font-bold tracking-tight text-white tabular-nums focus:outline-none glow-text"
              />
            </div>
          )}

          {step === 3 && (
            <select
              autoFocus
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 text-xl font-bold tracking-tight text-white tabular-nums text-center focus:outline-none focus:border-sky-500 transition-colors"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} className="bg-obsidian-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative flex gap-2">
          {step > 1 && (
            <button
              onClick={back}
              className="px-5 py-3.5 rounded-2xl text-sm font-semibold glass text-slate-300 active:scale-[0.98] transition-transform"
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
            >
              Back
            </button>
          )}
          <button
            onClick={advance}
            disabled={!stepValid}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-sky-400 to-emerald-400 text-obsidian-950 disabled:opacity-30 active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {step < 3 ? "Continue" : "Get Started"}
          </button>
        </div>

        <button
          onClick={onLoadDemo}
          className="relative w-full text-center text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
        >
          Load Demo Data instead
        </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
