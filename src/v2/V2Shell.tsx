import { useState } from "react";
import { ChartIcon, DialIcon, FlagIcon, GearIcon, HomeIcon, ListIcon, UserIcon } from "./icons";
import { V2Onboarding } from "./screens/V2Onboarding";
import { V2Overview } from "./screens/V2Overview";
import { V2ProjectionLab } from "./screens/V2ProjectionLab";
import { V2Subscriptions } from "./screens/V2Subscriptions";
import { V2History } from "./screens/V2History";
import { V2Settings } from "./screens/V2Settings";
import { V2_BASELINE, V2_HERO } from "./mockData";
import { V2Card } from "./V2Card";

type V2Tab = "overview" | "transactions" | "plan" | "goals" | "settings";

const TABS: { id: V2Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "transactions", label: "Transactions", icon: ListIcon },
  { id: "plan", label: "Plan", icon: DialIcon },
  { id: "goals", label: "Goals", icon: FlagIcon },
  { id: "settings", label: "Settings", icon: GearIcon },
];

export function V2Shell({ onExit }: { onExit: () => void }) {
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<V2Tab>("overview");
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen text-zinc-100 flex items-center justify-center p-4 sm:p-8"
      style={{ background: "#0B0E14", fontFamily: "var(--font-sans)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 900px 600px at 15% -10%, rgba(0,242,254,0.08), transparent 60%), radial-gradient(ellipse 800px 700px at 85% 10%, rgba(16,185,129,0.07), transparent 60%)",
        }}
      />

      <div className="max-w-[420px] w-full mx-auto min-h-[860px] bg-[#07090E] border border-zinc-800/80 rounded-[44px] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 relative flex flex-col justify-between overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-5">
          {started && (
            <>
              <header className="relative z-30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-9 w-9 rounded-full pointer-events-none"
                    style={{
                      background: "conic-gradient(from 180deg, #00F2FE, #10B981, #00F2FE)",
                      boxShadow: "0 0 16px -2px rgba(0,242,254,0.55)",
                    }}
                    aria-hidden
                  />
                  <span className="text-lg font-extrabold tracking-tight text-white">Runway</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal-400/40 text-teal-300">
                    OS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onExit}
                    className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Exit prototype
                  </button>
                  <button
                    onClick={() => setSummaryOpen(true)}
                    aria-label="Quick projection summary"
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-800/60 text-zinc-400 hover:text-teal-300 hover:border-teal-400/40 transition-colors"
                  >
                    <ChartIcon size={15} />
                  </button>
                  <button
                    onClick={() => setTab("settings")}
                    aria-label="Go to settings"
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-800/60 text-zinc-400 hover:text-teal-300 hover:border-teal-400/40 transition-colors"
                  >
                    <UserIcon size={15} />
                  </button>
                </div>
              </header>

              <div key={tab} style={{ animation: "floatIn 0.3s var(--ease-spring)" }}>
                {tab === "overview" && <V2Overview />}
                {tab === "transactions" && <V2History />}
                {tab === "plan" && <V2ProjectionLab />}
                {tab === "goals" && <V2Subscriptions />}
                {tab === "settings" && <V2Settings />}
              </div>
            </>
          )}

          {!started && <V2Onboarding onGetStarted={() => setStarted(true)} onExit={onExit} />}
        </div>

        {started && (
          <nav className="relative z-30 shrink-0 flex justify-center pt-4">
            <div className="flex items-center gap-1 rounded-full border border-zinc-800/60 bg-[#11161F]/90 backdrop-blur-md px-2 py-2">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`relative flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 rounded-full transition-colors ${
                      active ? "text-teal-300" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon size={18} style={active ? { filter: "drop-shadow(0 0 6px rgba(0,242,254,0.7))" } : undefined} />
                    <span className="text-[8.5px] font-semibold">{label}</span>
                    {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-teal-300" />}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {summaryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
          onClick={() => setSummaryOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <V2Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Quick projection summary
                </p>
                <button
                  onClick={() => setSummaryOpen(false)}
                  aria-label="Close"
                  className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black tabular-nums text-white">{V2_BASELINE.runway}</p>
                  <p className="text-[10px] text-zinc-500">Runway</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums text-teal-300">{V2_BASELINE.perDay}</p>
                  <p className="text-[10px] text-zinc-500">Safe to spend</p>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-800/60">
                <p className="text-xs text-zinc-400">
                  {V2_HERO.amount} is safe to spend today, based on your current balance and upcoming costs.
                </p>
              </div>
              <button
                onClick={() => {
                  setSummaryOpen(false);
                  setTab("plan");
                }}
                className="w-full py-3 rounded-2xl text-sm font-bold text-[#04120E] transition-transform active:scale-[0.98]"
                style={{ background: "linear-gradient(90deg, #00F2FE, #10B981)", transitionTimingFunction: "var(--ease-spring)" }}
              >
                Open Projection Lab
              </button>
            </V2Card>
          </div>
        </div>
      )}
    </div>
  );
}
