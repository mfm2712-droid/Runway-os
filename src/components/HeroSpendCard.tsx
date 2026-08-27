import { useLayoutEffect, useRef, useState } from "react";
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

  // The ring's widest usable chord for centered text is roughly its own
  // diameter. Longer formatted amounts (a longer currency code like "CHF",
  // or just a bigger number with a thousands separator) need more room than
  // short ones like "£248.43" — so instead of always shrinking the number
  // to fit a fixed ring, we first ask the ring to grow to absorb the extra
  // width (up to a cap), then MEASURE how much it actually got to grow —
  // on a narrow phone `48vw` is often already at or below the base ring
  // size, so the requested growth can be silently clamped by the viewport
  // — and only shrink the font as a last resort based on that real,
  // measured diameter, never the merely-requested one. This is driven
  // purely by the formatted string's length, never by currency code, so it
  // applies identically to every currency (including any future one) with
  // no special-casing, and never changes the layout for amounts that
  // already fit at the original size.
  const formattedSafeSpend = formatCurrency(safeSpend, state.currency);
  const CHAR_WIDTH_RATIO = 0.56; // empirical, Geist bold tabular-nums at this weight
  const RING_GROWTH_FIT = 0.88; // used only to decide how much the RING ITSELF should grow
  // Fraction of the (possibly grown) ring diameter actually reserved for text. Deliberately
  // tighter than RING_GROWTH_FIT above — this is the real safety margin: at the default
  // 186px ring it reserves ~20px of clear space per side, comfortably past the 12-16px
  // minimum, verified empirically for GBP/EUR/USD/CHF at both short and long amounts.
  const CONTENT_FIT = 0.78;
  const BASE_CHARS = 9; // "£1,234.56"-length amounts fit at the original size, untouched
  const MAX_RING_SCALE = 1.4; // ring may grow up to 40% larger before font size is touched

  const neededScale =
    formattedSafeSpend.length > BASE_CHARS
      ? (formattedSafeSpend.length * CHAR_WIDTH_RATIO * heroFontSize) / (ringSize * RING_GROWTH_FIT)
      : 1;
  const ringScale = Math.max(1, Math.min(MAX_RING_SCALE, neededScale));
  const requestedRingSize = ringSize * ringScale;
  const requestedRingStroke = ringStroke * ringScale;

  const ringRef = useRef<HTMLDivElement>(null);
  const [measuredRingDiameter, setMeasuredRingDiameter] = useState(ringSize);
  useLayoutEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const update = () => setMeasuredRingDiameter(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [requestedRingSize]);

  const contentMaxWidth = measuredRingDiameter * CONTENT_FIT;
  const fittedHeroFontSize = Math.min(
    heroFontSize,
    contentMaxWidth / (formattedSafeSpend.length * CHAR_WIDTH_RATIO),
  );

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
            ref={ringRef}
            value={pct}
            size={requestedRingSize}
            strokeWidth={requestedRingStroke}
            fluid
            className="aspect-square"
            style={{ width: `min(48vw, ${requestedRingSize}px)`, maxWidth: requestedRingSize }}
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
                className="tracking-[-0.015em] tabular-nums whitespace-nowrap"
                style={{ fontSize: fittedHeroFontSize, fontWeight: heroFontWeight, color: depleted ? RING_NEGATIVE : ringColor }}
              />
              {/* The secondary line has its own, looser width budget than the
                  currency figure above — it's a much smaller font and the
                  static phrase already fits on one line at the ring's normal
                  size, so it only needs to wrap for unusually long translated
                  strings, not be squeezed to the number's tighter budget. */}
              <span
                className="text-xs text-slate-400 mt-2 mx-auto text-center leading-snug"
                style={{ maxWidth: measuredRingDiameter * 0.85 }}
              >
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
