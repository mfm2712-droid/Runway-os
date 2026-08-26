import type { FinanceState } from "../types";
import {
  dailySafeSpend,
  formatCurrency,
  runwayMonths,
  spendingHorizonDays,
  spentToday,
} from "../lib/calculations";
import { hexToRgba, ringColorForPct, RING_NEGATIVE } from "../lib/ringColor";
import type { StreakData } from "../lib/streak";
import type { DailySeries } from "../lib/dailySeries";
import { usePulseOnChange } from "../hooks/usePulseOnChange";
import { GlassCard } from "./ui/GlassCard";
import { RingProgress } from "./ui/RingProgress";
import { QuickTuneModal } from "./QuickTuneModal";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { SafeSpendSparkline } from "./SafeSpendSparkline";
import { triggerHaptic } from "../lib/haptics";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function HeroSpendCard({
  state,
  onChange,
  stealth = false,
  streak,
  series,
  tuneOpen,
  onOpenTune,
  onCloseTune,
  ringSize = 186,
  ringStroke = 14,
  ringGlowBlur = 8,
  ringGlowOpacity = 0.62,
  heroFontSize = 34,
  heroFontWeight = 650,
}: {
  state: FinanceState;
  onChange: (patch: Partial<FinanceState>) => void;
  stealth?: boolean;
  streak?: StreakData;
  series?: DailySeries;
  tuneOpen: boolean;
  onOpenTune: () => void;
  onCloseTune: () => void;
  /** Design Lab clone overrides — ring geometry/glow and hero number typography. */
  ringSize?: number;
  ringStroke?: number;
  ringGlowBlur?: number;
  ringGlowOpacity?: number;
  heroFontSize?: number;
  heroFontWeight?: number;
}) {
  const { t } = useLanguage();
  const safeSpend = dailySafeSpend(state);
  const days = spendingHorizonDays(state);
  const runway = runwayMonths(state);
  const spent = spentToday(state);
  const remaining = safeSpend - spent;
  const pct = safeSpend > 0 ? Math.max(0, Math.min(1, remaining / safeSpend)) : 0;
  const overspent = remaining < 0;
  const depleted = remaining <= 0;
  const pulsing = usePulseOnChange(Math.round(safeSpend * 100));
  const ringAria = t("hero.ringAria", {
    amount: formatCurrency(Math.max(0, remaining), state.currency),
    percent: Math.round(pct * 100),
  });
  const ringColor = ringColorForPct(pct);

  return (
    <GlassCard opaque className="relative overflow-hidden px-6 py-10 flex flex-col items-center text-center">
      <div className="mesh-glow" />
      <p className="relative text-[10px] font-semibold text-cyan-400 uppercase tracking-[0.15em] mb-[14px]">
        {t("hero.dailySafeSpend")}
      </p>

      <button
        onClick={() => {
          triggerHaptic("light");
          playClick();
          onOpenTune();
        }}
        aria-label={`${t("hero.tuneNumbers")}. ${ringAria}`}
        className={`relative rounded-full active:scale-[0.97] transition-transform duration-200 ${
          pulsing ? "ring-pulse" : ""
        }`}
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      >
        <div style={{ transform: "translateY(-7px)" }}>
          <RingProgress
            value={pct}
            size={ringSize}
            strokeWidth={ringStroke}
            fluid
            className="w-[48vw] aspect-square"
            style={{ maxWidth: ringSize }}
            trackColor={hexToRgba(depleted ? RING_NEGATIVE : ringColor, 0.19)}
            glowBlur={ringGlowBlur}
            glowOpacity={ringGlowOpacity}
            stops={[
              { offset: "0%", color: ringColor },
              { offset: "100%", color: ringColor },
            ]}
          >
            <div className={`flex flex-col items-center transition-all duration-300 ${stealth ? "blur-md select-none" : ""}`}>
              <AnimatedNumber
                value={safeSpend}
                format={(v) => formatCurrency(v, state.currency)}
                className="tracking-[-0.015em] tabular-nums"
                style={{ fontSize: heroFontSize, fontWeight: heroFontWeight, color: depleted ? RING_NEGATIVE : "#f8fafc" }}
              />
              <span className="text-xs text-slate-400 mt-2">
                {t("hero.safeForNextDays", { days, plural: days === 1 ? "" : "s" })}
                {state.paydayDay ? t("hero.toPayday") : ""}
              </span>
              {overspent && (
                <span className="mt-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-400/15 text-red-400 tabular-nums">
                  {t("hero.overspentBy", { amount: formatCurrency(Math.abs(remaining), state.currency) })}
                </span>
              )}
            </div>
          </RingProgress>
        </div>
      </button>

      <p className={`relative text-[11px] text-slate-500 mt-[2px] transition-all duration-300 ${stealth ? "blur-sm select-none" : ""}`}>
        {t("hero.runwayHealth", { value: Number.isFinite(runway) ? `${runway.toFixed(1)} mo` : "∞" })}
      </p>
      <p className="relative text-[10px] text-slate-400 mt-1">{t("hero.tapToTune")}</p>

      {!!streak && streak.count > 0 && (
        <p className="relative text-[11px] font-medium text-orange-400 mt-3">
          {t("hero.streak", { count: streak.count })}
        </p>
      )}

      {!!series && series.length >= 2 && (
        <div className="relative w-full mt-5">
          <SafeSpendSparkline series={series} />
        </div>
      )}

      <QuickTuneModal open={tuneOpen} onClose={onCloseTune} state={state} onChange={onChange} />
    </GlassCard>
  );
}
