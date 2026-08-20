import { useState } from "react";
import type { FinanceState } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { Button } from "./ui/Button";

export function QuickTuneModal({
  open,
  onClose,
  state,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
  onChange: (patch: Partial<FinanceState>) => void;
}) {
  const [cash, setCash] = useState(String(state.cashBalance));
  const [buffer, setBuffer] = useState(String(state.safetyBuffer || 0));
  const [paydayEnabled, setPaydayEnabled] = useState(state.paydayDay != null);
  const [paydayDay, setPaydayDay] = useState(String(state.paydayDay ?? 28));

  if (!open) return null;

  const save = () => {
    onChange({
      cashBalance: Number(cash) || 0,
      safetyBuffer: Math.max(0, Number(buffer) || 0),
      paydayDay: paydayEnabled ? Math.min(31, Math.max(1, Number(paydayDay) || 1)) : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6 animate-[slideUp_0.25s_var(--ease-spring)]"
      >
        <div className="mesh-glow opacity-60" />
        <div className="relative flex justify-center md:hidden -mt-1">
          <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
        </div>

        <div className="relative flex justify-between items-center">
          <h3 className="text-base font-semibold text-white">Quick Tune</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">Liquid Cash</label>
          <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-sky-500 transition-colors">
            <span className="text-lg text-slate-500 mr-1">{CURRENCY_SYMBOLS[state.currency]}</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="w-full bg-transparent text-xl font-bold tracking-tight text-white tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">Monthly Safety Buffer</label>
          <p className="text-[10px] text-slate-600">
            Kept aside, excluded from what's shown as safe to spend.
          </p>
          <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-sky-500 transition-colors">
            <span className="text-lg text-slate-500 mr-1">{CURRENCY_SYMBOLS[state.currency]}</span>
            <input
              type="number"
              inputMode="decimal"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full bg-transparent text-xl font-bold tracking-tight text-white tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="relative space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">Payday Cycle</label>
            <button
              onClick={() => setPaydayEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                paydayEnabled ? "bg-sky-500" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  paydayEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              />
            </button>
          </div>
          {paydayEnabled ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={paydayDay}
                onChange={(e) => setPaydayDay(e.target.value)}
                className="w-20 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-600">
                Daily Safe Spend spreads to payday instead of month-end.
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600">
              Off — Daily Safe Spend spreads to the end of the calendar month.
            </p>
          )}
        </div>

        <Button variant="primary" onClick={save} className="relative w-full py-3.5 text-sm">
          Save
        </Button>
      </div>
    </div>
  );
}
