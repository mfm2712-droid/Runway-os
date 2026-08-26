import { useState } from "react";
import { V2Card } from "../V2Card";
import { RingProgress } from "../../components/ui/RingProgress";
import { V2_DATE, V2_FORMULA, V2_HERO, V2_METRICS } from "../mockData";
import { ClockIcon, RefreshIcon, WalletIcon } from "../icons";

const METRIC_ICONS = { clock: ClockIcon, wallet: WalletIcon, refresh: RefreshIcon };

export function V2Overview() {
  const [calcOpen, setCalcOpen] = useState(true);

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-zinc-500">{V2_DATE}</p>

      <V2Card className="relative overflow-hidden px-6 py-9 flex flex-col items-center text-center">
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden
        />
        <p className="relative text-[11px] tracking-widest uppercase text-zinc-400 font-semibold mb-6">
          {V2_HERO.label}
        </p>
        <RingProgress value={0.62} size={220} strokeWidth={12} color="#00F2FE" colorEnd="#10B981">
          <div className="flex flex-col items-center">
            <span
              className="text-5xl font-black tracking-tight tabular-nums text-white my-1"
              style={{ textShadow: "0 0 30px rgba(0,242,254,0.35)" }}
            >
              {V2_HERO.amount}
            </span>
            <span className="text-xs text-zinc-400">{V2_HERO.sublabel}</span>
          </div>
        </RingProgress>
        <div className="relative mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800/60 bg-white/[0.02]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: "0 0 8px 1px rgba(16,185,129,0.9)" }}
            aria-hidden
          />
          <span className="text-[11px] text-zinc-400">{V2_HERO.updated}</span>
        </div>
      </V2Card>

      <V2Card className="divide-y divide-zinc-800/60 px-4">
        {V2_METRICS.map((m) => {
          const Icon = METRIC_ICONS[m.icon];
          return (
            <div key={m.label} className="flex items-center gap-3 py-3.5">
              <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-teal-400/10 text-teal-300">
                <Icon size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{m.label}</p>
                <p className="text-[10px] text-zinc-500 truncate">{m.sublabel}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold tabular-nums text-white">{m.value}</p>
                <p
                  className={`text-[10px] font-medium ${
                    m.tagTone === "good" ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  {m.tag}
                </p>
              </div>
            </div>
          );
        })}
      </V2Card>

      <V2Card className="p-5 space-y-3">
        <button
          onClick={() => setCalcOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-teal-300 uppercase tracking-wider"
        >
          How this number is calculated
          <span aria-hidden>{calcOpen ? "︿" : "⌄"}</span>
        </button>
        {calcOpen && (
          <div className="flex flex-wrap gap-2" style={{ animation: "floatIn 0.2s var(--ease-spring)" }}>
            {V2_FORMULA.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800/60 bg-white/[0.02]"
              >
                {f.op && <span className="text-xs text-zinc-600">{f.op}</span>}
                <span className="text-[10px] text-zinc-500">{f.label}</span>
                <span className="text-xs font-bold tabular-nums text-white">{f.value}</span>
              </div>
            ))}
          </div>
        )}
      </V2Card>
    </div>
  );
}
