import { useMemo, useState } from "react";
import type { FinanceState } from "../types";
import { dailySafeSpend, formatCurrency, formatMonths, runwayMonths } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { RingProgress } from "./ui/RingProgress";
import { PremiumSlider } from "./ui/PremiumSlider";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { Button } from "./ui/Button";
import { STORAGE_KEY, ONBOARDED_KEY } from "../lib/storageKeys";

const CURRENCY = "GBP" as const;

function buildPreviewState(cash: number, outflows: number, subs: number): FinanceState {
  return {
    cashBalance: cash,
    fixedMonthlyOutflows: outflows,
    subscriptions:
      subs > 0
        ? [{ id: "calc-subs", name: "Subscriptions", amount: subs, renewsOn: 1, flaggedUnused: false }]
        : [],
    expenses: [],
    wishlist: [],
    safetyBuffer: 0,
    paydayDay: undefined,
    currency: CURRENCY,
  };
}

export function LandingCalculator({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [cash, setCash] = useState(4000);
  const [outflows, setOutflows] = useState(1200);
  const [subs, setSubs] = useState(60);

  const previewState = useMemo(() => buildPreviewState(cash, outflows, subs), [cash, outflows, subs]);
  const safeSpend = dailySafeSpend(previewState);
  const runway = runwayMonths(previewState);
  const ringValue = Number.isFinite(runway) ? Math.min(1, runway / 6) : 1;

  const openWithNumbers = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previewState));
    window.localStorage.setItem(ONBOARDED_KEY, JSON.stringify(true));
    onNavigate("/app");
  };

  return (
    <section className="space-y-5">
      <div className="text-center space-y-1.5">
        <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
          Test Your Numbers in 10s
        </p>
        <p className="text-xs text-slate-500">No sign-up — drag the sliders and see it live.</p>
      </div>

      <GlassCard strong className="relative overflow-hidden p-6 space-y-6">
        <div className="mesh-glow opacity-50" />

        <div className="relative flex flex-col items-center">
          <RingProgress value={ringValue} size={168} strokeWidth={10} color="#34d399">
            <div className="flex flex-col items-center">
              <AnimatedNumber
                value={safeSpend}
                format={(v) => formatCurrency(v, CURRENCY)}
                className="text-2xl font-extrabold tracking-tight tabular-nums text-white glow-text"
                style={{ color: "#34d399" }}
              />
              <span className="text-[9px] text-slate-400 mt-1">safe / day</span>
            </div>
          </RingProgress>
          <p className="text-[11px] text-slate-500 mt-3">
            Runway ·{" "}
            <AnimatedNumber
              value={runway}
              format={formatMonths}
              className="text-slate-300 font-semibold tabular-nums"
            />{" "}
            mo
          </p>
        </div>

        <div className="relative space-y-5">
          <PremiumSlider
            label="Liquid Cash"
            value={cash}
            min={0}
            max={20000}
            step={100}
            onChange={setCash}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#38bdf8"
          />
          <PremiumSlider
            label="Fixed Monthly Outflows"
            value={outflows}
            min={0}
            max={5000}
            step={50}
            onChange={setOutflows}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#fbbf24"
          />
          <PremiumSlider
            label="Subscriptions"
            value={subs}
            min={0}
            max={500}
            step={5}
            onChange={setSubs}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#a78bfa"
          />
        </div>

        <Button variant="primary" onClick={openWithNumbers} className="relative w-full py-3.5 text-sm">
          Open Runway OS with these numbers →
        </Button>
      </GlassCard>
    </section>
  );
}
