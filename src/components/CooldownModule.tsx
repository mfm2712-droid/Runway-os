import { useEffect, useState } from "react";
import type { FinanceState, WishlistItem } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { formatCurrency } from "../lib/calculations";
import { dailyLimitImpact, formatCountdown, isExpired, msRemaining, runwayDaysCost } from "../lib/cooldown";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { PlusIcon } from "./ui/Icons";
import { triggerHaptic } from "../lib/haptics";
import { playPop } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function CooldownModule({
  wishlist,
  state,
  onAdd,
  onBuySafely,
  onDiscard,
}: {
  wishlist: WishlistItem[];
  state: FinanceState;
  onAdd: (item: Omit<WishlistItem, "id" | "addedAt">) => void;
  onBuySafely: (item: WishlistItem) => void;
  onDiscard: (item: WishlistItem) => void;
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const submit = () => {
    const p = parseFloat(price);
    if (!name.trim() || !Number.isFinite(p) || p <= 0) return;
    onAdd({ name: name.trim(), price: p, reason: reason.trim() });
    setName("");
    setPrice("");
    setReason("");
    setAdding(false);
  };

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-semibold text-white">{t("cooldown.title")}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">{t("cooldown.subtitle")}</p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          {adding ? (
            t("subs.cancel")
          ) : (
            <>
              <PlusIcon width={12} height={12} strokeWidth={2.4} /> {t("subs.add")}
            </>
          )}
        </button>
      </div>

      {adding && (
        <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-[floatIn_0.2s_var(--ease-spring)]">
          <input
            placeholder={t("cooldown.itemPlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder={t("cooldown.pricePlaceholder", { symbol: CURRENCY_SYMBOLS[state.currency] })}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
          <input
            placeholder={t("cooldown.whyPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
          <Button variant="primary" onClick={submit} className="w-full py-2.5 text-xs">
            {t("cooldown.start")}
          </Button>
        </div>
      )}

      {wishlist.length === 0 && !adding && (
        <div className="text-center space-y-2.5 py-2">
          <p className="text-xl" aria-hidden>
            ❄️
          </p>
          <div className="space-y-1">
            <h5 className="text-sm font-semibold text-white">{t("cooldown.nothingCooling")}</h5>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[220px] mx-auto">
              {t("cooldown.nothingCoolingDetail")}
            </p>
          </div>
          <Button variant="glass" onClick={() => setAdding(true)} className="mx-auto px-5 py-2 text-xs">
            {t("cooldown.logImpulseBuy")}
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {wishlist.map((item) => {
          const remaining = msRemaining(item.addedAt, now);
          const expired = isExpired(item.addedAt, now);
          const elapsedPct = Math.min(
            100,
            ((72 * 60 * 60 * 1000 - remaining) / (72 * 60 * 60 * 1000)) * 100,
          );
          const days = runwayDaysCost(item.price, state);
          const dailyHit = dailyLimitImpact(item.price, state);

          return (
            <li
              key={item.id}
              className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-200 text-xs truncate">{item.name}</p>
                  {item.reason && (
                    <p className="text-[10px] text-slate-500 truncate">{item.reason}</p>
                  )}
                </div>
                <span className="font-semibold tracking-tight text-sm text-white tabular-nums shrink-0">
                  {formatCurrency(item.price, state.currency)}
                </span>
              </div>

              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    expired ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>

              <p className="text-[11px] text-rose-300/90">
                {t("cooldown.costsPrefix")}{" "}
                <span className="font-semibold tracking-tight tabular-nums">{days.toFixed(1)} {t("cooldown.days")}</span>{" "}
                {t("cooldown.costsSuffix")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <p className="text-slate-500">{t("cooldown.runwayCost")}</p>
                  <p className="text-rose-300 font-semibold tracking-tight tabular-nums">−{days.toFixed(1)} {t("cooldown.days")}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <p className="text-slate-500">{t("cooldown.lowersLimit")}</p>
                  <p className="text-rose-300 font-semibold tracking-tight tabular-nums">−{formatCurrency(dailyHit, state.currency)}{t("cooldown.perDay")}</p>
                </div>
              </div>

              {expired ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      triggerHaptic("medium");
                      playPop();
                      onBuySafely(item);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300 active:scale-[0.97] transition-transform"
                    style={{ transitionTimingFunction: "var(--ease-spring)" }}
                  >
                    {t("cooldown.buySafely")}
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic("success");
                      playPop();
                      onDiscard(item);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 active:scale-[0.97] transition-transform"
                    style={{ transitionTimingFunction: "var(--ease-spring)" }}
                  >
                    {t("cooldown.discardAndBank")} <span className="tabular-nums">{formatCurrency(item.price, state.currency)}</span>
                  </button>
                </div>
              ) : (
                <p className="text-center text-[10px] text-amber-400/80 py-1">
                  {t("cooldown.unlocksIn", { time: formatCountdown(remaining) })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
