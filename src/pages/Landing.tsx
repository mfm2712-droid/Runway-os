import { useEffect, useState } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { RingProgress } from "../components/ui/RingProgress";
import { Button } from "../components/ui/Button";
import { LandingCalculator } from "../components/LandingCalculator";
import { startCheckout, type Plan } from "../lib/checkout";
import { track } from "../lib/analytics";
import { useLanguage } from "../lib/i18n/LanguageContext";

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1">
      <button
        onClick={() => setLang("en")}
        aria-label="English"
        aria-pressed={lang === "en"}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-base leading-none transition-opacity ${
          lang === "en" ? "opacity-100" : "opacity-40 hover:opacity-70"
        }`}
      >
        🇬🇧
      </button>
      <button
        onClick={() => setLang("es")}
        aria-label="Español"
        aria-pressed={lang === "es"}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-base leading-none transition-opacity ${
          lang === "es" ? "opacity-100" : "opacity-40 hover:opacity-70"
        }`}
      >
        🇪🇸
      </button>
    </div>
  );
}

export function Landing({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useLanguage();
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
      setCheckoutError(t("landing.pricing.checkoutError"));
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="relative text-slate-100 min-h-screen overflow-x-hidden">
      <div className="mesh-glow" />
      <LanguageToggle />

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
            {t("landing.hero.titleLine1")}
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-emerald-300 bg-clip-text text-transparent">
              {t("landing.hero.titleLine2")}
            </span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl bg-sky-400/50 blur-xl opacity-70"
                aria-hidden
              />
              <Button
                variant="primary"
                onClick={() => {
                  track({ name: "trial_cta_clicked", source: "hero" });
                  onNavigate("/app");
                }}
                className="relative px-7 py-3.5 text-sm"
              >
                {t("landing.hero.cta")}
              </Button>
            </div>
            <a
              href="#pricing"
              className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4 decoration-white/20"
            >
              {t("landing.hero.seePricing")}
            </a>
          </div>
          <p className="text-[11px] text-slate-500">{t("landing.hero.finePrint")}</p>
        </header>

        {/* Before / After — left is an illustrative mockup of spreadsheet chaos,
            right is the actual product's hero card with sample data. */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider text-center">
              {t("landing.before.label")}
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
            <p className="text-[11px] text-slate-500 text-center">{t("landing.before.caption")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider text-center">
              {t("landing.after.label")}
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
                    <span className="text-[9px] text-slate-400 mt-1">{t("landing.common.safePerDay")}</span>
                  </div>
                </RingProgress>
              </GlassCard>
            </div>
            <p className="text-[11px] text-slate-500 text-center">{t("landing.after.caption")}</p>
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
              title: t("landing.features.dailySafeSpend.title"),
              body: t("landing.features.dailySafeSpend.body"),
            },
            {
              title: t("landing.features.zeroIncomeRunway.title"),
              body: t("landing.features.zeroIncomeRunway.body"),
            },
            {
              title: t("landing.features.leakDetector.title"),
              body: t("landing.features.leakDetector.body"),
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
                  {t("landing.ai.eyebrow")}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight text-balance">
                  {t("landing.ai.title")}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto md:mx-0">
                  {t("landing.ai.subtitle")}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1">
                  {t("landing.ai.exampleLabel")}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-sky-500 text-obsidian-950 text-sm font-medium">
                      {t("landing.ai.chatQuestion")}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[90%] space-y-1.5">
                      <span className="text-[11px] ai-gradient-text font-semibold px-1">
                        {t("landing.ai.chatBadge")}
                      </span>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md glass border border-violet-400/15 text-sm text-slate-200 leading-relaxed">
                        {t("landing.ai.chatAnswer")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: t("landing.ai.feature1.title"),
                  body: t("landing.ai.feature1.body"),
                },
                {
                  title: t("landing.ai.feature2.title"),
                  body: t("landing.ai.feature2.body"),
                },
                {
                  title: t("landing.ai.feature3.title"),
                  body: t("landing.ai.feature3.body"),
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
              {t("landing.pricing.eyebrow")}
            </p>
            <p className="text-xs text-slate-500">{t("landing.pricing.subtitle")}</p>
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
                  {t("landing.pricing.monthly")}
                </p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
                  £2.99
                </p>
                <p className="text-[10px] text-slate-500 mb-2">{t("landing.pricing.perMonth")}</p>
                <p className="text-[11px] font-semibold text-sky-300">
                  {checkoutLoading === "monthly" ? t("landing.pricing.redirecting") : t("landing.pricing.chooseMonthly")}
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
                  {t("landing.pricing.mostPopular")}
                </span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                  {t("landing.pricing.annual")}
                </p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
                  £25.00
                </p>
                <p className="text-[10px] text-slate-500 mb-2">{t("landing.pricing.perYear")}</p>
                <p className="text-[11px] font-semibold text-emerald-300">
                  {checkoutLoading === "annual" ? t("landing.pricing.redirecting") : t("landing.pricing.chooseAnnual")}
                </p>
              </GlassCard>
            </button>
          </div>

          {checkoutError && (
            <p className="text-[10px] text-rose-400 text-center">{checkoutError}</p>
          )}

          <p className="text-[10px] text-slate-400 text-center">
            {t("landing.pricing.chargeDisclaimer")}
          </p>

          <ul className="text-xs text-slate-400 space-y-2 text-left max-w-[220px] mx-auto">
            <li>{t("landing.pricing.bullet1")}</li>
            <li>{t("landing.pricing.bullet2")}</li>
            <li>{t("landing.pricing.bullet3")}</li>
          </ul>

          <Button
            variant="primary"
            onClick={() => {
              track({ name: "trial_cta_clicked", source: "pricing" });
              onNavigate("/app");
            }}
            className="w-full py-3.5 text-sm"
          >
            {t("landing.hero.cta")}
          </Button>
        </section>

        {/* FAQ — plain <details>/<summary>, no JS state needed for the accordion */}
        <section className="max-w-xl mx-auto w-full space-y-4">
          <h2 className="text-xl font-bold text-white text-center tracking-tight">
            {t("landing.faq.title")}
          </h2>
          <GlassCard className="divide-y divide-white/[0.06]">
            {[
              { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
              { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
              { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
              { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
              { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
              { q: t("landing.faq.q6"), a: t("landing.faq.a6") },
              { q: t("landing.faq.q7"), a: t("landing.faq.a7") },
              { q: t("landing.faq.q8"), a: t("landing.faq.a8") },
            ].map(({ q, a }) => (
              <details key={q} className="group p-4">
                <summary className="flex items-center justify-between gap-3 text-sm font-medium text-white cursor-pointer list-none">
                  {q}
                  <span className="shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-xs text-slate-400 leading-relaxed mt-2.5 pr-6">{a}</p>
              </details>
            ))}
          </GlassCard>
        </section>

        <footer className="pt-8 border-t border-white/[0.06] space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/app-icon.png"
                alt="Runway OS"
                className="w-6 h-6 rounded-lg border border-white/10 object-cover"
              />
              <span className="text-xs font-semibold text-slate-400">{t("landing.footer.brand")}</span>
            </div>
            <nav className="flex items-center gap-5 text-xs text-slate-500">
              <button onClick={() => onNavigate("/privacy")} className="hover:text-white transition-colors">
                {t("landing.footer.privacy")}
              </button>
              <button onClick={() => onNavigate("/terms")} className="hover:text-white transition-colors">
                {t("landing.footer.terms")}
              </button>
              <a href="mailto:support@runwayos.app" className="hover:text-white transition-colors">
                support@runwayos.app
              </a>
            </nav>
          </div>
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            {t("landing.footer.disclaimer")}
          </p>
        </footer>
      </div>
    </div>
  );
}
