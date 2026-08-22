import { useEffect, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { RingProgress } from "../components/ui/RingProgress";
import { Button } from "../components/ui/Button";
import { LandingCalculator } from "../components/LandingCalculator";
import { startCheckout, type Plan } from "../lib/checkout";
import { track } from "../lib/analytics";

export function Landing({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Ring fills in from empty on first paint — a small, honest reveal (no
  // fake product video), skipped entirely for reduced-motion users since
  // RingProgress's own transition already respects that intent.
  const [ringValue, setRingValue] = useState(0);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setRingValue(0.72);
      return;
    }
    const id = window.setTimeout(() => setRingValue(0.72), 200);
    return () => window.clearTimeout(id);
  }, []);

  const choosePlan = async (plan: Plan) => {
    setCheckoutError(null);
    setCheckoutLoading(plan);
    track({ name: "checkout_clicked", plan });
    try {
      await startCheckout(plan);
    } catch {
      setCheckoutError("Couldn't start checkout — Stripe may not be configured yet.");
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="relative text-slate-100 min-h-screen overflow-x-hidden">
      <div className="mesh-glow" />

      <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-24">
        {/* Hero */}
        <header className="text-center space-y-6">
          <div className="relative inline-flex items-center gap-2.5 mx-auto">
            <div className="absolute -inset-3 rounded-full bg-sky-400/25 blur-xl" aria-hidden />
            <img
              src="/app-icon.png"
              alt="Runway OS"
              className="relative w-11 h-11 rounded-2xl border border-white/15 shadow-lg shadow-cyan-500/30 object-cover"
            />
            <span className="relative flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-lg">Runway</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border border-cyan-400/40 text-cyan-300 bg-cyan-400/5">
                OS
              </span>
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05] text-balance">
            The friction-free
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
              financial operating system.
            </span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            One number that matters: your safe daily spending limit. No manual
            categorization, no linked bank accounts, no subscription you forget to
            cancel — plus a built-in AI copilot for the questions a spreadsheet
            can't answer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl bg-sky-400/50 blur-xl opacity-70"
                aria-hidden
              />
              <Button
                variant="primary"
                onClick={() => onNavigate("/app")}
                className="relative px-7 py-3.5 text-sm"
              >
                Start Free 72-Hour Trial
              </Button>
            </div>
            <a
              href="#pricing"
              className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4 decoration-white/20"
            >
              See pricing ↓
            </a>
          </div>
          <p className="text-[11px] text-slate-500">
            No card required to start · cancel anytime · set up in under 2 minutes
          </p>
        </header>

        {/* Before / After — left is an illustrative mockup of spreadsheet chaos,
            right is the actual product's hero card with sample data. */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider text-center">
              Before
            </p>
            <GlassCard className="p-3">
              <div className="grid grid-cols-4 gap-px bg-white/[0.06] text-[9px] font-mono rounded-2xl overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => {
                  const flagged = [2, 7, 13, 18].includes(i);
                  return (
                    <div
                      key={i}
                      className={`p-2 truncate ${
                        flagged
                          ? "bg-rose-500/15 text-rose-300 font-bold"
                          : "bg-obsidian-900 text-slate-500"
                      }`}
                    >
                      {flagged ? "!ERR" : (Math.random() * 900 + 10).toFixed(2)}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
            <p className="text-[11px] text-slate-500 text-center">
              Untracked leaks buried in fifty rows of formulas.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider text-center">
              After
            </p>
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-[32px] bg-emerald-400/15 blur-2xl"
                aria-hidden
              />
              <GlassCard strong className="relative overflow-hidden flex flex-col items-center py-8">
                <RingProgress value={ringValue} size={132} strokeWidth={8} color="#34d399">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-extrabold tracking-tight tabular-nums text-white glow-text" style={{ color: "#34d399" }}>
                      £45.00
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1">safe / day</span>
                  </div>
                </RingProgress>
              </GlassCard>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              One glanceable number. That's the whole app.
            </p>
          </div>
        </section>

        {/* Interactive calculator — real dailySafeSpend/runwayMonths math, no signup */}
        <div className="max-w-sm mx-auto w-full">
          <LandingCalculator onNavigate={onNavigate} />
        </div>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Daily Safe Spend",
              body: "Reserves this month's fixed costs and already-logged expenses, then spreads what's left across the days remaining.",
            },
            {
              title: "Zero-Income Runway",
              body: "How many months your cash reserve covers if income stopped today, subscriptions included.",
            },
            {
              title: "Subscription Leak Detector",
              body: "Flag anything you no longer use and see the monthly cost of forgotten renewals at a glance.",
            },
          ].map((f) => (
            <GlassCard key={f.title} interactive className="p-5">
              <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
            </GlassCard>
          ))}
        </section>

        {/* AI Copilot showcase */}
        <section>
          <GlassCard strong className="ai-border-glow relative overflow-hidden p-6 md:p-8 space-y-8">
            <div className="mesh-glow opacity-50" />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-center md:text-left space-y-3">
                <p className="text-[11px] font-semibold ai-gradient-text uppercase tracking-[0.2em]">
                  ✨ AI Financial Copilot
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight text-balance">
                  Not just numbers — answers.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto md:mx-0">
                  Your numbers stay local by default. AI features send only what's
                  needed — your financial snapshot and the question you ask — to a
                  secured endpoint, only when you use them.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1">
                  Example conversation
                </p>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-sky-500 text-obsidian-950 text-sm font-medium">
                      Can I afford £120 for a flight this weekend?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[90%] space-y-1.5">
                      <span className="text-[11px] ai-gradient-text font-semibold px-1">
                        ✨ Money Copilot
                      </span>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md glass border border-violet-400/15 text-sm text-slate-200 leading-relaxed">
                        Yes — you'd have £84 left in this month's safe-to-spend
                        after that. Runway drops from 4.2 to 4.0 months.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Ask Money Copilot",
                  body: "“Can I afford this?” “How do I extend my runway?” Get a direct answer grounded in your real numbers, not generic advice.",
                },
                {
                  title: "Scan a Receipt",
                  body: "Drop a photo or paste a line of text. Merchant, amount, category, and recurring-vs-one-off are extracted and logged for you.",
                },
                {
                  title: "Morning Briefing",
                  body: "One sentence, every time you open the app: what's safe to spend, and the single change that would help most.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-sm mx-auto space-y-4 scroll-mt-8">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
              ✨ Free for 72 hours
            </p>
            <p className="text-xs text-slate-500">Full access to everything. Cancel anytime, no card required to start.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => choosePlan("monthly")}
              disabled={checkoutLoading !== null}
              className="text-left disabled:opacity-50"
            >
              <GlassCard
                interactive
                className="p-4 pb-5 space-y-1 text-center h-full hover:border-sky-400/40 transition-colors"
              >
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Monthly
                </p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
                  £2.99
                </p>
                <p className="text-[10px] text-slate-500 mb-2">/ month</p>
                <p className="text-[11px] font-semibold text-sky-300">
                  {checkoutLoading === "monthly" ? "Redirecting…" : "Choose Monthly →"}
                </p>
              </GlassCard>
            </button>

            <button
              onClick={() => choosePlan("annual")}
              disabled={checkoutLoading !== null}
              className="text-left disabled:opacity-50"
            >
              <GlassCard
                strong
                interactive
                className="relative p-4 pb-5 space-y-1 text-center h-full border border-sky-400/40"
              >
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 text-obsidian-950 whitespace-nowrap">
                  Most Popular · Save 30%
                </span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                  Annual
                </p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
                  £25.00
                </p>
                <p className="text-[10px] text-slate-500 mb-2">/ year</p>
                <p className="text-[11px] font-semibold text-emerald-300">
                  {checkoutLoading === "annual" ? "Redirecting…" : "Choose Annual →"}
                </p>
              </GlassCard>
            </button>
          </div>

          {checkoutError && (
            <p className="text-[10px] text-rose-400 text-center">{checkoutError}</p>
          )}

          <p className="text-[10px] text-slate-400 text-center">
            You're only charged if you pick a plan above. The free trial itself
            (button below) never asks for a card.
          </p>

          <ul className="text-xs text-slate-400 space-y-2 text-left max-w-[220px] mx-auto">
            <li>✓ Unlimited Projection Lab scenarios</li>
            <li>✓ Money Copilot: ask, scan receipts, daily briefing</li>
            <li>✓ Core numbers are local-first — nothing leaves your browser until you ask the AI</li>
          </ul>

          <Button
            variant="primary"
            onClick={() => onNavigate("/app")}
            className="w-full py-3.5 text-sm"
          >
            Start Free 72-Hour Trial
          </Button>
        </section>

        <footer className="pt-8 border-t border-white/[0.06] space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/app-icon.png"
                alt="Runway OS"
                className="w-6 h-6 rounded-lg border border-white/10 object-cover"
              />
              <span className="text-xs font-semibold text-slate-400">Runway OS</span>
            </div>
            <nav className="flex items-center gap-5 text-xs text-slate-500">
              <button onClick={() => onNavigate("/privacy")} className="hover:text-white transition-colors">
                Privacy
              </button>
              <button onClick={() => onNavigate("/terms")} className="hover:text-white transition-colors">
                Terms
              </button>
              <a
                href="https://github.com/mfm2712-droid/Runway-os"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Built in the open ↗
              </a>
            </nav>
          </div>
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Runway OS is an independent tool and is not financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
