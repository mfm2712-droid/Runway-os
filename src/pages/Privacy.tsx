import { GlassCard } from "../components/ui/GlassCard";

export function Privacy({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="relative text-slate-100 min-h-screen overflow-x-hidden">
      <div className="mesh-glow" />
      <div className="relative max-w-2xl mx-auto px-4 md:px-8 py-16 space-y-8">
        <button
          onClick={() => onNavigate("/")}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Runway OS
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500">
            Describes what actually happens in the product, not boilerplate. Last updated
            21 August 2026.
          </p>
        </div>

        <GlassCard className="p-5">
          <p className="text-sm text-amber-300/90 leading-relaxed">
            This page accurately documents how Runway OS handles data today. It isn't
            written or reviewed by a lawyer — if you need this to be legally binding
            (e.g. for a specific jurisdiction's compliance requirements), have a
            solicitor review it before relying on it as-is.
          </p>
        </GlassCard>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Your financial data stays on your device</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Cash balance, outflows, subscriptions, expenses, and your wishlist are stored
            only in your browser's <code className="text-slate-300">localStorage</code>. None
            of it is sent to us or stored on a server. Clearing your browser's site data,
            or switching devices, means it's gone unless you've exported a backup
            (Settings → Export Backup) yourself.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">When you use an AI feature</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Money Copilot, receipt scanning, and the morning briefing are the only
            features that send data off your device — and only when you actively use
            them. Each request sends a compact snapshot of your numbers (balances,
            totals, category breakdowns — never raw account or card numbers, since we
            never collect those) plus your question or the receipt image, to our server,
            which forwards it to Anthropic's API to generate a response. Anthropic
            processes that request under their own API terms; we don't control their
            retention policy and you should review{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              Anthropic's privacy policy
            </a>{" "}
            if that matters to you. We don't log or store these requests ourselves.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">If you subscribe</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Payment is handled entirely by Stripe — we never see or store your card
            details. Stripe collects your email and payment information under their own
            privacy policy. We store your Stripe customer ID in your browser's local
            storage so the app can recognise your subscription and let you manage
            billing; we don't keep a database of customers ourselves. If you restore
            access on a new device by email, that email is sent to our server for a
            single real-time check against Stripe and isn't stored afterward.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            We use Vercel Web Analytics, which is cookie-free and doesn't track you
            individually across sites. It tells us aggregate things like which pages get
            visited and whether people click through to checkout — not who you are.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Third parties, in full</h2>
          <ul className="text-sm text-slate-400 leading-relaxed space-y-1.5 list-disc list-inside">
            <li><strong className="text-slate-300">Vercel</strong> — hosting, serverless functions, analytics.</li>
            <li><strong className="text-slate-300">Anthropic</strong> — processes AI requests, only when you use an AI feature.</li>
            <li><strong className="text-slate-300">Stripe</strong> — payment processing, only if you subscribe.</li>
          </ul>
          <p className="text-sm text-slate-400 leading-relaxed">
            That's the complete list. No ad networks, no trackers, no data brokers, no
            selling of data — there's no data of yours on our servers to sell.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Your rights</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Since we don't hold a database of your financial data, there's nothing for us
            to export or delete on that front — it's already entirely in your control, on
            your device. For anything Stripe or Anthropic hold about you directly (billing
            records, API request logs), contact them directly using the links above, or
            email us and we'll help point you the right way.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            [TODO: add a real contact email and, if you have one, your registered
            business name and country — required for a complete, compliant privacy
            policy in most jurisdictions.]
          </p>
        </section>
      </div>
    </div>
  );
}
