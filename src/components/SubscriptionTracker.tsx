import { useState } from "react";
import type { Currency, FinanceState, Subscription } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import { formatCurrency } from "../lib/calculations";
import { generateCancellationEmail, generateNegotiationScript } from "../lib/ai/client";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { SkeletonLines } from "./ai/Skeleton";
import { FlagIcon, PlusIcon, TrashIcon } from "./ui/Icons";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function daysSince(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function SummaryBar({
  subscriptions,
  currency,
}: {
  subscriptions: Subscription[];
  currency: Currency;
}) {
  const total = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const flaggable = subscriptions.filter((s) => s.flaggedUnused).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs">
      <span className="text-slate-400">Total Monthly Outflow</span>
      <span className="font-semibold tracking-tight tabular-nums text-white">{formatCurrency(total, currency)}</span>
      {flaggable > 0 && (
        <>
          <span className="text-slate-600">•</span>
          <span className="font-semibold tracking-tight tabular-nums text-rose-400">
            {formatCurrency(flaggable, currency)}
          </span>
          <span className="text-rose-400/80">flaggable as unused</span>
        </>
      )}
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
        ? await generateNegotiationScript(sub, state)
        : await generateCancellationEmail(sub, state);
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
          { value: "negotiate", label: "☎️ Negotiate First" },
          { value: "cancel", label: "✨ Cancel Draft" },
        ]}
      />

      {!draft && !generating && (
        <Button
          variant="primary"
          onClick={generate}
          className="w-full py-3 text-xs bg-gradient-to-r from-violet-400 to-sky-400"
        >
          {mode === "negotiate" ? "☎️ Generate Negotiation Script" : "✨ Cancel Draft"}
        </Button>
      )}

      {generating && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 space-y-2">
          <p className="text-[10px] ai-gradient-text font-semibold animate-pulse">
            {mode === "negotiate" ? "☎️ Drafting script…" : "✨ Drafting…"}
          </p>
          <SkeletonLines lines={4} />
        </div>
      )}

      {draft && !generating && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] ai-gradient-text font-semibold">
              {mode === "negotiate" ? "☎️ Script ready" : "✨ Draft ready"}
            </span>
            {!isLive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-500">
                Simulated
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
            {copied ? "✓ Copied" : "Copy Draft"}
          </button>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onMarkCancelled(sub.id);
        }}
        className="w-full py-3 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 active:scale-[0.98] transition-transform"
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      >
        Mark as Cancelled
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
}: {
  subscriptions: Subscription[];
  state: FinanceState;
  savedTotal: number;
  onAdd: (sub: Omit<Subscription, "id">) => void;
  onRemove: (id: string) => void;
  onToggleFlag: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [renewsOn, setRenewsOn] = useState("1");

  const submit = () => {
    const amt = Number(amount);
    if (!name.trim() || !amt || amt <= 0) return;
    onAdd({
      name: name.trim(),
      amount: amt,
      renewsOn: Math.min(31, Math.max(1, Number(renewsOn) || 1)),
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
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400/10 to-sky-400/10 border border-emerald-400/25">
          <span className="text-xl" aria-hidden>
            🎉
          </span>
          <p className="text-xs text-emerald-200">
            <span className="font-bold tabular-nums">
              {formatCurrency(savedTotal * 12, state.currency)}/yr
            </span>{" "}
            saved by trimming inactive leaks
          </p>
        </div>
      )}

      <SummaryBar subscriptions={subscriptions} currency={state.currency} />

      <GlassCard className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-white">Recurring Outflows</h4>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            {adding ? "Cancel" : (
              <>
                <PlusIcon width={12} height={12} strokeWidth={2.4} /> Add
              </>
            )}
          </button>
        </div>

        {adding && (
          <div className="space-y-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] animate-[floatIn_0.2s_var(--ease-spring)]">
            <input
              placeholder="Name (e.g. Gym Membership)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder={`${CURRENCY_SYMBOLS[state.currency]}/mo`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-1/2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Renews on (day)"
                value={renewsOn}
                onChange={(e) => setRenewsOn(e.target.value)}
                className="w-1/2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <Button variant="primary" onClick={submit} className="w-full py-2.5 text-xs">
              Add subscription
            </Button>
          </div>
        )}

        {subscriptions.length === 0 && !adding && (
          <p className="text-xs text-slate-400 py-2">No subscriptions tracked yet.</p>
        )}

        <ul className="space-y-2">
          {subscriptions.map((s) => {
            const days = daysSince(s.flaggedSince);
            const expanded = expandedId === s.id;
            return (
              <li
                key={s.id}
                onClick={() => s.flaggedUnused && setExpandedId(expanded ? null : s.id)}
                className={`text-xs p-3.5 rounded-2xl border group transition-colors ${
                  s.flaggedUnused
                    ? "bg-rose-500/[0.04] border-rose-500/20 cursor-pointer"
                    : "bg-white/[0.025] border-white/[0.06]"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-slate-200 truncate">{s.name}</p>
                      {s.flaggedUnused && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 shrink-0">
                          Unused {days}+ days
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {s.flaggedUnused ? "Tap to review & cancel · " : ""}Renews on the {ordinal(s.renewsOn)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold tracking-tight text-slate-200 tabular-nums">
                      {formatCurrency(s.amount, state.currency)}/mo
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFlag(s.id);
                      }}
                      title="Toggle unused"
                      aria-label={s.flaggedUnused ? "Unflag as unused" : "Flag as unused"}
                      aria-pressed={s.flaggedUnused}
                      className={`transition-colors ${
                        s.flaggedUnused ? "text-rose-400" : "text-slate-400 hover:text-rose-400"
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

                {expanded && <CancelDrawer sub={s} state={state} onMarkCancelled={onRemove} />}
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </div>
  );
}
