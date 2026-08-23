import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FinanceState } from "../types";
import {
  formatCurrency,
  formatRunwayDisplay,
  runwayMonths,
  subscriptionsTotal,
  totalMonthlyOutflow,
} from "../lib/calculations";
import { backdropVariants, panelVariants } from "../lib/motionPresets";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function RunwayExplainerModal({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
}) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const fixed = state.fixedMonthlyOutflows;
  const subs = subscriptionsTotal(state);
  const burn = totalMonthlyOutflow(state);
  const runway = runwayMonths(state);
  const { value, unit } = formatRunwayDisplay(runway, t("stats.sustainable"));
  const zeroBurn = burn <= 0;

  const dismiss = () => {
    playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={dismiss}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-5"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={t("runwayExplainer.title")}
          >
            <div className="mesh-glow opacity-60" />
            <div className="relative flex justify-center md:hidden -mt-1">
              <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
            </div>

            <div className="relative flex justify-between items-start">
              <h3 className="text-base font-semibold text-white">{t("runwayExplainer.title")}</h3>
              <button
                onClick={dismiss}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 text-center">
              <p className="text-sm font-semibold text-white">{t("runwayExplainer.formula")}</p>
              <p className="text-[10px] text-slate-500 mt-1">{t("runwayExplainer.formulaMeaning")}</p>
            </div>

            <div className="relative space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {t("runwayExplainer.yourNumbers")}
              </p>
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden">
                <Row label={t("runwayExplainer.liquidCash")} value={formatCurrency(state.cashBalance, state.currency)} />
                <Row label={t("runwayExplainer.fixedOutflows")} value={formatCurrency(fixed, state.currency)} />
                <Row label={t("runwayExplainer.subscriptions")} value={formatCurrency(subs, state.currency)} />
                <Row label={t("runwayExplainer.totalOutflow")} value={formatCurrency(burn, state.currency)} emphasis />
              </div>
            </div>

            <div className="relative rounded-2xl bg-gradient-to-r from-sky-400/10 to-emerald-400/10 border border-sky-400/20 p-4 text-center space-y-1">
              {zeroBurn ? (
                <>
                  <p className="text-lg font-bold tracking-tight text-white">{t("runwayExplainer.sustainable")}</p>
                  <p className="text-[10px] text-slate-400">{t("runwayExplainer.sustainableDetail")}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold tracking-tight text-white tabular-nums">
                    {formatCurrency(state.cashBalance, state.currency)}{" "}
                    <span className="text-slate-500 font-normal text-sm">÷</span>{" "}
                    {formatCurrency(burn, state.currency)}{" "}
                    <span className="text-slate-500 font-normal text-sm">=</span>{" "}
                    {value} {unit}
                  </p>
                  <p className="text-[10px] text-slate-400">{t("runwayExplainer.disclaimer")}</p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs px-4 py-3">
      <span className={emphasis ? "text-slate-300" : "text-slate-500"}>{label}</span>
      <span
        className={`font-semibold tabular-nums ${emphasis ? "text-white" : "text-slate-300"}`}
      >
        {value}
      </span>
    </div>
  );
}
