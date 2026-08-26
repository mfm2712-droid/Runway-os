import { useState, type ReactNode } from "react";
import type { FinanceState } from "../types";
import {
  formatCurrency,
  formatRunwayDisplay,
  runwayMonths,
  subscriptionsTotal,
  unusedSubscriptionsTotal,
} from "../lib/calculations";
import { ClockIcon, InfoIcon, RefreshIcon, WalletIcon } from "./ui/Icons";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { RunwayExplainerModal } from "./RunwayExplainerModal";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

function StatRow({
  icon,
  title,
  primary,
  secondary,
  onInfoClick,
  infoLabel,
}: {
  icon: ReactNode;
  title: string;
  primary: ReactNode;
  secondary: ReactNode;
  onInfoClick?: () => void;
  infoLabel?: string;
}) {
  return (
    <div className="card-opaque rounded-[14px] h-[54px] px-3.5 flex items-center gap-3">
      <span className="h-7 w-7 shrink-0 rounded-[8px] border border-cyan-400/20 bg-cyan-400/5 flex items-center justify-center text-cyan-400">
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <p className="text-[15px] font-medium text-white truncate">{title}</p>
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            aria-label={infoLabel}
            className="text-slate-600 hover:text-slate-400 transition-colors -m-1 p-1 shrink-0"
          >
            <InfoIcon width={11} height={11} />
          </button>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[15px] font-semibold tabular-nums text-white leading-tight">{primary}</p>
        <p className="text-[11px] text-slate-500 tabular-nums leading-tight">{secondary}</p>
      </div>
      <span className="text-slate-700 shrink-0" aria-hidden>
        ›
      </span>
    </div>
  );
}

export function StatPills({ state, stealth = false }: { state: FinanceState; stealth?: boolean }) {
  const { t } = useLanguage();
  const runway = runwayMonths(state);
  const subsTotal = subscriptionsTotal(state);
  const unusedTotal = unusedSubscriptionsTotal(state);
  const unusedCount = state.subscriptions.filter((s) => s.flaggedUnused).length;
  const maskClass = `transition-all duration-300 ${stealth ? "blur-sm select-none" : ""}`;
  const [explainerOpen, setExplainerOpen] = useState(false);
  const runwayDisplay = formatRunwayDisplay(runway, t("stats.sustainable"));
  const runwayStatus = !Number.isFinite(runway)
    ? t("stats.sustainable")
    : runway >= 3
    ? t("stats.onTrack")
    : t("stats.tight");
  const subsCount = state.subscriptions.length;
  const subsCountLabel =
    subsCount === 1
      ? t("stats.subscriptionCountOne", { count: subsCount })
      : t("stats.subscriptionCountOther", { count: subsCount });

  return (
    <>
      <div className="space-y-2.5">
        <StatRow
          icon={<ClockIcon width={15} height={15} />}
          title={t("stats.runway")}
          onInfoClick={() => {
            playClick();
            setExplainerOpen(true);
          }}
          infoLabel={t("stats.runwayInfo")}
          primary={
            <span className={maskClass}>
              <AnimatedNumber value={runway} format={(v) => formatRunwayDisplay(v).value} />{" "}
              <span className="font-sans text-[10px] font-normal text-slate-500">{runwayDisplay.unit}</span>
            </span>
          }
          secondary={runwayStatus}
        />
        <StatRow
          icon={<WalletIcon width={15} height={15} />}
          title={t("stats.fixedCosts")}
          primary={<span className={maskClass}>{formatCurrency(state.fixedMonthlyOutflows, state.currency)}</span>}
          secondary={t("stats.next30Days")}
        />
        <StatRow
          icon={<RefreshIcon width={15} height={15} />}
          title={t("stats.recurringLeaks")}
          primary={<span className={maskClass}>{formatCurrency(subsTotal, state.currency)}</span>}
          secondary={
            unusedCount > 0
              ? t("stats.unused", { count: unusedCount, amount: formatCurrency(unusedTotal, state.currency) })
              : subsCountLabel
          }
        />
      </div>
      <RunwayExplainerModal open={explainerOpen} onClose={() => setExplainerOpen(false)} state={state} />
    </>
  );
}
