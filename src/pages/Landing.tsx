import { GlassCard } from "../components/ui/GlassCard";
import { RingProgress } from "../components/ui/RingProgress";
import { Button } from "../components/ui/Button";
import { DynamicIsland } from "../components/ui/DynamicIsland";

// TODO: replace with your real Lemon Squeezy checkout URL once the product is live.
// Dashboard → Products → (your product) → Copy checkout URL.
const CHECKOUT_URL = "https://YOUR-STORE.lemonsqueezy.com/checkout/buy/YOUR-VARIANT-ID";

function CheckoutButton({ className = "" }: { className?: string }) {
  return (
    <a href={CHECKOUT_URL}>
      <Button variant="primary" className={`px-7 py-3.5 text-sm ${className}`}>
        Get Instant Access — £29
      </Button>
    </a>
  );
}

export function Landing({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="relative text-slate-100 min-h-screen overflow-x-hidden">
      <div className="mesh-glow" />

      <div className="relative max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-24">
        {/* Hero */}
        <header className="text-center space-y-6">
          <DynamicIsland label="Runway OS" />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
            The friction-free
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
              financial operating system.
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            One number that matters: your safe daily spending limit. No manual
            categorization, no linked bank accounts, no subscription you forget to
            cancel — plus a built-in AI copilot for the questions a spreadsheet
            can't answer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <CheckoutButton />
            <button
              onClick={() => onNavigate("/app")}
              className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4 decoration-white/20"
            >
              Try the live tool first →
            </button>
          </div>
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
            <GlassCard strong className="relative overflow-hidden flex flex-col items-center py-8">
              <RingProgress value={0.72} size={132} strokeWidth={8} color="#34d399">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-extrabold tracking-tight tabular-nums text-white glow-text" style={{ color: "#34d399" }}>
                    £45.00
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1">safe / day</span>
                </div>
              </RingProgress>
            </GlassCard>
            <p className="text-[11px] text-slate-500 text-center">
              One glanceable number. That's the whole app.
            </p>
          </div>
        </section>

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
          <GlassCard strong className="ai-border-glow relative overflow-hidden p-6 md:p-8 space-y-6">
            <div className="mesh-glow opacity-50" />
            <div className="relative text-center space-y-2">
              <p className="text-[11px] font-semibold ai-gradient-text uppercase tracking-[0.2em]">
                ✨ AI Financial Copilot
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Not just numbers — answers.
              </h2>
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
            <p className="relative text-[11px] text-slate-500 text-center">
              Your numbers stay local by default. AI features send only what's needed —
              your financial snapshot and the question you ask — to a secured endpoint,
              only when you use them.
            </p>
          </GlassCard>
        </section>

        {/* Pricing */}
        <section className="max-w-sm mx-auto">
          <GlassCard strong className="relative overflow-hidden text-center p-8 space-y-5">
            <div className="mesh-glow opacity-50" />
            <p className="relative text-xs text-slate-400 uppercase tracking-wider">
              One-time payment
            </p>
            <p className="relative text-5xl font-extrabold tracking-tight tabular-nums text-white">
              £29 <span className="text-base font-normal text-slate-500">/ $37</span>
            </p>
            <ul className="relative text-xs text-slate-400 space-y-2 text-left max-w-[220px] mx-auto">
              <li>✓ Lifetime access, no subscription</li>
              <li>✓ Core numbers are local-first — nothing leaves your browser until you ask the AI</li>
              <li>✓ AI copilot: ask, scan receipts, daily briefing</li>
              <li>✓ Source included</li>
            </ul>
            <CheckoutButton className="relative w-full" />
          </GlassCard>
        </section>

        <footer className="text-center text-[11px] text-slate-600 pt-8 border-t border-white/[0.06]">
          Runway OS is an independent tool and is not financial advice.
        </footer>
      </div>
    </div>
  );
}
