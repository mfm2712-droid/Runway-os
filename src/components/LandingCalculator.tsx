import { useMemo, useState } from "react";
import type { FinanceState } from "../types";
import { dailySafeSpend, formatCurrency, formatMonths, runwayMonths } from "../lib/calculations";
import { GlassCard } from "./ui/GlassCard";
import { RingProgress } from "./ui/RingProgress";
import { PremiumSlider } from "./ui/PremiumSlider";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { Button } from "./ui/Button";
import { STORAGE_KEY, ONBOARDED_KEY, TRIAL_STARTED_KEY } from "../lib/storageKeys";
import { track } from "../lib/analytics";
import { useLanguage } from "../lib/i18n/LanguageContext";

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

function hasExistingLedger(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function LandingCalculator({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useLanguage();
  const [cash, setCash] = useState(4000);
  const [outflows, setOutflows] = useState(1200);
  const [subs, setSubs] = useState(60);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);

  const previewState = useMemo(() => buildPreviewState(cash, outflows, subs), [cash, outflows, subs]);
  const safeSpend = dailySafeSpend(previewState);
  const runway = runwayMonths(previewState);
  const ringValue = Number.isFinite(runway) ? Math.min(1, runway / 6) : 1;

  const writeAndNavigate = () => {
    track({ name: "trial_calculator_clicked" });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previewState));
    window.localStorage.setItem(ONBOARDED_KEY, JSON.stringify(true));
    // This instant-setup path is the trial's real start, same as finishing
    // the onboarding modal — only backfill if a trial hasn't already begun.
    if (!window.localStorage.getItem(TRIAL_STARTED_KEY)) {
      window.localStorage.setItem(TRIAL_STARTED_KEY, JSON.stringify(new Date().toISOString()));
    }
    onNavigate("/app");
  };

  const openWithNumbers = () => {
    if (hasExistingLedger() && !confirmingOverwrite) {
      setConfirmingOverwrite(true);
      return;
    }
    writeAndNavigate();
  };

  return (
    <section className="space-y-5">
      <div className="text-center space-y-1.5">
        <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
          {t("landing.calc.eyebrow")}
        </p>
        <p className="text-xs text-[oklch(0.57_0.046_257.417)]">{t("landing.calc.subtitle")}</p>
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
              <span className="text-[9px] text-slate-400 mt-1">{t("landing.common.safePerDay")}</span>
            </div>
          </RingProgress>
          <p className="text-[11px] text-[oklch(0.57_0.046_257.417)] mt-3">
            {t("landing.calc.runwayLabel")}{" "}
            <AnimatedNumber
              value={runway}
              format={formatMonths}
              className="text-slate-300 font-semibold tabular-nums"
            />{" "}
            {t("landing.calc.months")}
          </p>
        </div>

        <div className="relative space-y-5">
          <PremiumSlider
            label={t("landing.calc.liquidCash")}
            value={cash}
            min={0}
            max={20000}
            step={100}
            onChange={setCash}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#38bdf8"
          />
          <PremiumSlider
            label={t("landing.calc.fixedOutflows")}
            value={outflows}
            min={0}
            max={5000}
            step={50}
            onChange={setOutflows}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#fbbf24"
          />
          <PremiumSlider
            label={t("landing.calc.subscriptions")}
            value={subs}
            min={0}
            max={500}
            step={5}
            onChange={setSubs}
            format={(v) => formatCurrency(v, CURRENCY)}
            color="#a78bfa"
          />
        </div>

        {confirmingOverwrite ? (
          <div className="relative space-y-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
            <p className="text-[11px] text-amber-200 leading-relaxed">
              {t("landing.calc.overwriteWarning")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingOverwrite(false)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold glass text-white active:scale-[0.98] transition-transform"
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                {t("landing.calc.cancel")}
              </button>
              <button
                onClick={writeAndNavigate}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-300 active:scale-[0.98] transition-transform"
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                {t("landing.calc.confirmOverwrite")}
              </button>
            </div>
          </div>
        ) : (
          <Button variant="primary" onClick={openWithNumbers} className="relative w-full py-3.5 text-sm">
            {t("landing.calc.openCta")}
          </Button>
        )}
      </GlassCard>
    </section>
  );
}
