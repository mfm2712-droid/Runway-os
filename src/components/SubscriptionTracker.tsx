import { useState } from "react";
import type { Currency, FinanceState, Subscription } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { formatCurrency, subscriptionRunwayImpactDays, subscriptionsRunwayImpactDays } from "../lib/calculations";
import { generateCancellationEmail, generateNegotiationScript } from "../lib/ai/client";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { SkeletonLines } from "./ai/Skeleton";
import { FlagIcon, PencilIcon, PlusIcon, TrashIcon } from "./ui/Icons";
import { useLanguage } from "../lib/i18n/LanguageContext";
import type { Lang } from "../lib/i18n/translations";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Spanish doesn't use ordinal suffixes for "renews on the 5th" — just the
// plain day number reads naturally there ("Se renueva el 5").
function renewalDay(n: number, lang: Lang): string {
  return lang === "es" ? String(n) : ordinal(n);
}

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function SummaryBar({
  subscriptions,
  state,
}: {
  subscriptions: Subscription[];
  state: FinanceState;
}) {
  const { t } = useLanguage();
  const currency = state.currency;
  const total = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const flaggable = subscriptions.filter((s) => s.flaggedUnused).reduce((sum, s) => sum + s.amount, 0);
  const impactDays = subscriptionsRunwayImpactDays(state);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs">
      <span className="text-slate-400">{t("subs.totalMonthlyOutflow")}</span>
      <span className="font-semibold tracking-tight tabular-nums text-white">{formatCurrency(total, currency)}</span>
      {Number.isFinite(impactDays) && impactDays > 0 && (
        <>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{t("subs.impactOnRunway")}</span>
          <span className="font-semibold tracking-tight tabular-nums text-red-400">
            −{impactDays.toFixed(1)} {t("subs.daysAbbrev")}
          </span>
        </>
      )}
      {flaggable > 0 && (
        <>
          <span className="text-slate-600">•</span>
          <span className="font-semibold tracking-tight tabular-nums text-red-400">
            {formatCurrency(flaggable, currency)}
          </span>
          <span className="text-red-400/80">{t("subs.flaggableAsUnused")}</span>
        </>
      )}
    </div>
  );
}

function AmountDayFields({
  currency,
  amount,
  onAmountChange,
  renewsOn,
  onRenewsOnChange,
}: {
  currency: Currency;
  amount: string;
  onAmountChange: (v: string) => void;
  renewsOn: string;
  onRenewsOnChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="flex gap-2">
        <div className="w-1/2 space-y-1">
          <label className="text-[10px] text-slate-500 block">{t("subs.amountPerMonth")}</label>
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-cyan-400 transition-colors">
            <span className="text-xs text-slate-500 mr-1">{CURRENCY_SYMBOLS[currency]}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>
        </div>
        <div className="w-1/2 space-y-1">
          <label className="text-[10px] text-slate-500 block">{t("subs.renewsOnDay")}</label>
          <input
            type="number"
            min={1}
            max={31}
            placeholder={t("subs.dayPlaceholder")}
            value={renewsOn}
            onChange={(e) => onRenewsOnChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>
      <p className="text-[9px] text-slate-500">{t("subs.renewsOnHelp")}</p>
    </>
  );
}

function EditSubscriptionForm({
  sub,
  currency,
  onSave,
  onCancel,
}: {
  sub: Subscription;
  currency: Currency;
  onSave: (patch: { name: string; amount: number; renewsOn: number }) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(sub.name);
  const [amount, setAmount] = useState(String(sub.amount));
  const [renewsOn, setRenewsOn] = useState(String(sub.renewsOn));

  const save = (e: React.MouseEvent) => {
    e.stopPropagation();
    const amt = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const day = parseFloat(renewsOn);
    onSave({
      name: name.trim(),
      amount: amt,
      renewsOn: Math.min(31, Math.max(1, Number.isFinite(day) ? day : 1)),
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-3 pt-3 border-t border-white/[0.08] space-y-2.5 animate-[floatIn_0.2s_var(--ease-spring)]"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("subs.name")}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
      />
      <AmountDayFields
        currency={currency}
        amount={amount}
        onAmountChange={setAmount}
        renewsOn={renewsOn}
        onRenewsOnChange={setRenewsOn}
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={save} className="flex-1 py-2.5 text-xs">
          {t("subs.save")}
        </Button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="px-4 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {t("subs.cancel")}
        </button>
      </div>
    </div>
  );
}

type CancelMode = "cancel" | "negotiate";

function CancelDrawer({
  sub,
  state,
  onMarkCancelled,
}: {
  sub: Subscription;
  state: FinanceState;
  onMarkCancelled: (id: string) => void;
}) {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<CancelMode>("negotiate");
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenerating(true);
    const result =
      mode === "negotiate"
        ? await generateNegotiationScript(sub, state, lang)
        : await generateCancellationEmail(sub, state, lang);
    setDraft(result.draft);
    setIsLive(result.isLive);
    setGenerating(false);
  };

  const switchMode = (m: CancelMode) => {
    setMode(m);
    setDraft(null);
  };

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — user can still select the text manually
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-3 pt-3 border-t border-white/[0.08] space-y-3 animate-[floatIn_0.2s_var(--ease-spring)]"
    >
      <SegmentedControl
        value={mode}
        onChange={switchMode}
        options={[
          { value: "negotiate", label: t("subs.negotiateFirst") },
          { value: "cancel", label: t("subs.cancelDraft") },
        ]}
      />

      {!draft && !generating && (
        <Button
          variant="primary"
          onClick={generate}
          className="w-full py-3 text-xs bg-gradient-to-r from-violet-400 to-cyan-400"
        >
          {mode === "negotiate" ? t("subs.generateScript") : t("subs.generateCancelDraft")}
        </Button>
      )}

      {generating && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 space-y-2">
          <p className="text-[10px] ai-gradient-text font-semibold animate-pulse">
            {mode === "negotiate" ? t("subs.draftingScript") : t("subs.drafting")}
          </p>
          <SkeletonLines lines={4} />
        </div>
      )}

      {draft && !generating && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] ai-gradient-text font-semibold">
              {mode === "negotiate" ? t("subs.scriptReady") : t("subs.draftReady")}
            </span>
            {!isLive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-500">
                {t("subs.simulated")}
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[11px] text-slate-300 leading-relaxed rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 max-h-48 overflow-y-auto">
            {draft}
          </pre>
          <button
            onClick={copy}
            className="w-full py-2.5 rounded-xl text-[11px] font-semibold glass text-white active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {copied ? t("subs.copied") : t("subs.copyDraft")}
          </button>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onMarkCancelled(sub.id);
        }}
        className="w-full py-3 rounded-xl text-xs font-semibold bg-mint-400/15 border border-mint-400/30 text-mint-400 active:scale-[0.98] transition-transform"
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      >
        {t("subs.markCancelled")}
      </button>
    </div>
  );
}

export function SubscriptionTracker({
  subscriptions,
  state,
  savedTotal,
  onAdd,
  onRemove,
  onToggleFlag,
  onUpdate,
}: {
  subscriptions: Subscription[];
  state: FinanceState;
  savedTotal: number;
  onAdd: (sub: Omit<Subscription, "id">) => void;
  onRemove: (id: string) => void;
  onToggleFlag: (id: string) => void;
  onUpdate: (id: string, patch: { name: string; amount: number; renewsOn: number }) => void;
}) {
  const { t, lang } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [renewsOn, setRenewsOn] = useState("1");

  const submit = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const renewsN = parseFloat(renewsOn);
    onAdd({
      name: name.trim(),
      amount: amt,
      renewsOn: Math.min(31, Math.max(1, Number.isFinite(renewsN) ? renewsN : 1)),
      flaggedUnused: false,
    });
    setName("");
    setAmount("");
    setRenewsOn("1");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {savedTotal > 0 && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-mint-400/10 to-cyan-400/10 border border-mint-400/25">
          <span className="text-xl" aria-hidden>
            🎉
          </span>
          <p className="text-xs text-mint-400">
            <span className="font-bold tabular-nums">
              {formatCurrency(savedTotal * 12, state.currency)}/yr
            </span>{" "}
            {t("subs.savedByTrimming")}
          </p>
        </div>
      )}

      <SummaryBar subscriptions={subscriptions} state={state} />

      <GlassCard opaque className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">{t("subs.recurringOutflows")}</h4>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-400 font-medium transition-colors"
          >
            {adding ? t("subs.cancel") : (
              <>
                <PlusIcon width={12} height={12} strokeWidth={2.4} /> {t("subs.add")}
              </>
            )}
          </button>
        </div>

        {adding && (
          <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-[floatIn_0.2s_var(--ease-spring)]">
            <input
              placeholder={t("subs.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <AmountDayFields
              currency={state.currency}
              amount={amount}
              onAmountChange={setAmount}
              renewsOn={renewsOn}
              onRenewsOnChange={setRenewsOn}
            />
            <Button variant="primary" onClick={submit} className="w-full py-2.5 text-xs">
              {t("subs.addSubscription")}
            </Button>
          </div>
        )}

        {subscriptions.length === 0 && !adding && (
          <div className="text-center space-y-2.5 py-2">
            <p className="text-xl" aria-hidden>
              🔄
            </p>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-white">{t("subs.noSubsYet")}</h5>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[220px] mx-auto">
                {t("subs.noSubsDetail")}
              </p>
            </div>
            <Button variant="glass" onClick={() => setAdding(true)} className="mx-auto px-5 py-2 text-xs">
              {t("subs.addASubscription")}
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {subscriptions.map((s) => {
            const days = daysSince(s.flaggedSince);
            const expanded = expandedId === s.id;
            const editing = editingId === s.id;
            const impactDays = subscriptionRunwayImpactDays(state, s);
            return (
              <li
                key={s.id}
                onClick={() => s.flaggedUnused && setExpandedId(expanded ? null : s.id)}
                className={`text-xs p-3.5 rounded-2xl border group transition-colors ${
                  s.flaggedUnused
                    ? "bg-red-400/[0.04] border-red-400/20 cursor-pointer"
                    : "bg-white/[0.025] border-white/[0.06]"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-slate-200 truncate">{s.name}</p>
                      {s.flaggedUnused && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-400/15 text-red-400 shrink-0">
                          {t("subs.unusedDays", { days })}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {s.flaggedUnused ? t("subs.tapToReview") : ""}
                      {t("subs.renewsOnThe", { day: renewalDay(s.renewsOn, lang) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold tracking-tight text-slate-200 tabular-nums">
                        {formatCurrency(s.amount, state.currency)}/mo
                      </p>
                      {Number.isFinite(impactDays) && impactDays > 0 && (
                        <p className="text-[10px] font-medium text-red-400 tabular-nums">
                          −{impactDays.toFixed(1)} {t("subs.daysAbbrev")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(null);
                        setEditingId(editing ? null : s.id);
                      }}
                      title="Edit"
                      aria-label="Edit subscription"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <PencilIcon width={15} height={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFlag(s.id);
                      }}
                      title="Toggle unused"
                      aria-label={s.flaggedUnused ? "Unflag as unused" : "Flag as unused"}
                      aria-pressed={s.flaggedUnused}
                      className={`transition-colors ${
                        s.flaggedUnused ? "text-red-400" : "text-slate-400 hover:text-red-400"
                      }`}
                    >
                      <FlagIcon width={15} height={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(s.id);
                      }}
                      title="Remove"
                      aria-label="Remove subscription"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </div>
                </div>

                {editing && (
                  <EditSubscriptionForm
                    sub={s}
                    currency={state.currency}
                    onSave={(patch) => {
                      onUpdate(s.id, patch);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}

                {expanded && !editing && <CancelDrawer sub={s} state={state} onMarkCancelled={onRemove} />}
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </div>
  );
}
