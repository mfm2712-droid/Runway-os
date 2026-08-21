import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/Button";
import { isValidLicenseFormat } from "../lib/trial";
import { track } from "../lib/analytics";
import { startCheckout, type Plan } from "../lib/checkout";
import { backdropVariants, panelVariants } from "../lib/motionPresets";

type KeyState = "idle" | "invalid" | "valid";
type RestoreState = "idle" | "checking" | "not-found" | "found" | "error";

export function PaywallModal({
  open,
  onClose,
  onActivate,
}: {
  open: boolean;
  onClose: () => void;
  onActivate: (key: string) => void;
}) {
  const [key, setKey] = useState("");
  const [keyState, setKeyState] = useState<KeyState>("idle");
  const [email, setEmail] = useState("");
  const [restoreState, setRestoreState] = useState<RestoreState>("idle");
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const submitKey = () => {
    if (isValidLicenseFormat(key)) {
      setKeyState("valid");
      onActivate(key.trim().toUpperCase());
    } else {
      setKeyState("invalid");
    }
  };

  const choosePlan = async (plan: Plan) => {
    setCheckoutError(null);
    setCheckoutLoading(plan);
    track({ name: "checkout_clicked", plan });
    try {
      await startCheckout(plan);
      // startCheckout redirects the browser on success — if we're still
      // here, the promise resolved without a redirect happening, which
      // shouldn't occur, but leave the loading state cleared just in case.
    } catch {
      setCheckoutError("Couldn't start checkout — Stripe may not be configured yet.");
      setCheckoutLoading(null);
    }
  };

  const restoreByEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setRestoreState("checking");
    try {
      const res = await fetch("/api/restore-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { found: boolean; customerId?: string };
      if (data.found && data.customerId) {
        onActivate(data.customerId);
        setRestoreState("found");
      } else {
        setRestoreState("not-found");
      }
    } catch {
      setRestoreState("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={onClose}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6 max-h-[90vh] overflow-y-auto"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Unlock Full Access"
          >
        <div className="mesh-glow opacity-60" />

        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span aria-hidden>✨</span>
            <h3 className="text-base font-semibold text-white">Unlock Full Access</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="relative text-xs text-slate-400 leading-relaxed">
          Your trial has ended. Keep the Projection Lab and Money Copilot with a
          Pro plan — cancel anytime.
        </p>

        <div className="relative grid grid-cols-2 gap-3">
          <button
            onClick={() => choosePlan("monthly")}
            disabled={checkoutLoading !== null}
            className="text-left disabled:opacity-50"
          >
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 h-full flex flex-col hover:border-sky-400/40 transition-colors">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Monthly
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white mt-2">
                £2.99
              </p>
              <p className="text-[10px] text-slate-500 mb-3">/ month</p>
              <span className="mt-auto text-[11px] font-semibold text-sky-300">
                {checkoutLoading === "monthly" ? "Redirecting…" : "Choose Monthly →"}
              </span>
            </div>
          </button>

          <button
            onClick={() => choosePlan("annual")}
            disabled={checkoutLoading !== null}
            className="text-left disabled:opacity-50"
          >
            <div className="relative rounded-2xl bg-gradient-to-b from-sky-400/[0.08] to-emerald-400/[0.08] border border-sky-400/40 p-4 h-full flex flex-col">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 text-obsidian-950 whitespace-nowrap">
                Most Popular · Save 30%
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                Annual
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white mt-2">
                £25.00
              </p>
              <p className="text-[10px] text-slate-500 mb-3">/ year</p>
              <span className="mt-auto text-[11px] font-semibold text-emerald-300">
                {checkoutLoading === "annual" ? "Redirecting…" : "Choose Annual →"}
              </span>
            </div>
          </button>
        </div>

        {checkoutError && (
          <p className="relative text-[10px] text-rose-400 -mt-2">{checkoutError}</p>
        )}

        <ul className="relative text-[11px] text-slate-400 space-y-1.5 pl-1">
          <li>✓ Unlimited Projection Lab scenarios</li>
          <li>✓ Money Copilot: ask, scan receipts, daily briefing</li>
          <li>✓ Cancel anytime, no lock-in</li>
        </ul>

        <div className="relative pt-3 border-t border-white/[0.08] space-y-2.5">
          <label className="text-xs text-slate-500 block">
            Already subscribed? Restore access with your email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setRestoreState("idle");
              }}
              placeholder="you@example.com"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
            <Button
              variant="glass"
              onClick={restoreByEmail}
              disabled={restoreState === "checking"}
              className="px-4 py-2.5 text-xs shrink-0"
            >
              {restoreState === "checking" ? "Checking…" : "Restore"}
            </Button>
          </div>
          {restoreState === "not-found" && (
            <p className="text-[10px] text-rose-400">
              No active subscription found for that email.
            </p>
          )}
          {restoreState === "found" && (
            <p className="text-[10px] text-emerald-400">✓ Subscription restored — welcome back.</p>
          )}
          {restoreState === "error" && (
            <p className="text-[10px] text-rose-400">
              Couldn't check that right now — try again in a moment.
            </p>
          )}
        </div>

        <div className="relative space-y-2.5">
          <label className="text-xs text-slate-500 block">Or enter a license key</label>
          <div className="flex gap-2">
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyState("idle");
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className={`flex-1 bg-white/[0.04] border rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none tracking-wider uppercase ${
                keyState === "invalid"
                  ? "border-rose-500/60 focus:border-rose-500"
                  : keyState === "valid"
                  ? "border-emerald-500/60 focus:border-emerald-500"
                  : "border-white/[0.08] focus:border-sky-500"
              }`}
            />
            <Button variant="glass" onClick={submitKey} className="px-4 py-2.5 text-xs shrink-0">
              Apply
            </Button>
          </div>
          {keyState === "invalid" && (
            <p className="text-[10px] text-rose-400">
              That doesn't look like a valid key — check the format and try again.
            </p>
          )}
          {keyState === "valid" && (
            <p className="text-[10px] text-emerald-400">✓ License activated — welcome back.</p>
          )}
          <p className="text-[9px] text-slate-400 leading-relaxed">
            Runway OS keeps your financial data local to your browser. Checkout,
            subscription status, and restore-by-email are verified against
            Stripe server-side — the manual key field above stays as a
            fallback for hand-issued access.
          </p>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
