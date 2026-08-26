import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/Button";
import { SUPPORT_ACCESS_LICENSE } from "../lib/trial";
import { track } from "../lib/analytics";
import { startCheckout, type Plan } from "../lib/checkout";
import { backdropVariants, panelVariants } from "../lib/motionPresets";
import { playClick } from "../lib/audio";
import { useSyncSubscriptionCheck } from "../hooks/useSyncSubscriptionCheck";
import { useLanguage } from "../lib/i18n/LanguageContext";

type TokenState = "idle" | "checking" | "invalid" | "valid" | "error";
type RestoreState = "idle" | "checking" | "not-found" | "found" | "error";

export function PaywallModal({
  open,
  onClose,
  onActivate,
  licenseKey,
  onLicenseInvalid,
}: {
  open: boolean;
  onClose: () => void;
  onActivate: (key: string) => void;
  licenseKey: string | null;
  onLicenseInvalid: () => void;
}) {
  useSyncSubscriptionCheck(open, licenseKey, onLicenseInvalid);
  const { t } = useLanguage();
  const [token, setToken] = useState("");
  const [tokenState, setTokenState] = useState<TokenState>("idle");
  const [email, setEmail] = useState("");
  const [restoreState, setRestoreState] = useState<RestoreState>("idle");
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const dismiss = () => {
    playClick();
    onClose();
  };

  const submitToken = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setTokenState("checking");
    try {
      const res = await fetch("/api/verify-support-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { valid: boolean };
      if (data.valid) {
        setTokenState("valid");
        onActivate(SUPPORT_ACCESS_LICENSE);
      } else {
        setTokenState("invalid");
      }
    } catch {
      setTokenState("error");
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
      setCheckoutError(t("paywall.checkoutError"));
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
          onClick={dismiss}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-sm card-opaque glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6 max-h-[90vh] overflow-y-auto"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={t("paywall.title")}
          >
        <div className="mesh-glow opacity-60" />

        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span aria-hidden>✨</span>
            <h3 className="text-base font-semibold text-white">{t("paywall.title")}</h3>
          </div>
          <button
            onClick={dismiss}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="relative text-xs text-slate-400 leading-relaxed">
          {t("paywall.trialEnded")}
        </p>

        <div className="relative grid grid-cols-2 gap-3">
          <button
            onClick={() => choosePlan("monthly")}
            disabled={checkoutLoading !== null}
            className="text-left disabled:opacity-50"
          >
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 h-full flex flex-col hover:border-cyan-400/40 transition-colors">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {t("paywall.monthly")}
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white mt-2">
                £2.99
              </p>
              <p className="text-[10px] text-slate-500 mb-3">{t("paywall.perMonth")}</p>
              <span className="mt-auto text-[11px] font-semibold text-cyan-400">
                {checkoutLoading === "monthly" ? t("paywall.redirecting") : t("paywall.chooseMonthly")}
              </span>
            </div>
          </button>

          <button
            onClick={() => choosePlan("annual")}
            disabled={checkoutLoading !== null}
            className="text-left disabled:opacity-50"
          >
            <div className="relative rounded-2xl bg-gradient-to-b from-cyan-400/[0.08] to-mint-400/[0.08] border border-cyan-400/40 p-4 h-full flex flex-col">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-mint-400 text-obsidian-950 whitespace-nowrap">
                {t("paywall.mostPopular")}
              </span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                {t("paywall.annual")}
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-white mt-2">
                £25.00
              </p>
              <p className="text-[10px] text-slate-500 mb-3">{t("paywall.perYear")}</p>
              <span className="mt-auto text-[11px] font-semibold text-mint-400">
                {checkoutLoading === "annual" ? t("paywall.redirecting") : t("paywall.chooseAnnual")}
              </span>
            </div>
          </button>
        </div>

        {checkoutError && (
          <p className="relative text-[10px] text-red-400 -mt-2">{checkoutError}</p>
        )}

        <ul className="relative text-[11px] text-slate-400 space-y-1.5 pl-1">
          <li>{t("paywall.feature1")}</li>
          <li>{t("paywall.feature2")}</li>
          <li>{t("paywall.feature3")}</li>
        </ul>

        <div className="relative pt-3 border-t border-white/[0.08] space-y-2.5">
          <label className="text-xs text-slate-500 block">
            {t("paywall.restoreLabel")}
          </label>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {t("paywall.restoreHelp")}
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setRestoreState("idle");
              }}
              placeholder="you@example.com"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <Button
              variant="glass"
              onClick={restoreByEmail}
              disabled={restoreState === "checking"}
              className="px-4 py-2.5 text-xs shrink-0"
            >
              {restoreState === "checking" ? t("paywall.checking") : t("paywall.restore")}
            </Button>
          </div>
          {restoreState === "not-found" && (
            <p className="text-[10px] text-red-400">
              {t("paywall.notFound")}
            </p>
          )}
          {restoreState === "found" && (
            <p className="text-[10px] text-mint-400">
              {t("paywall.restored")}
            </p>
          )}
          {restoreState === "error" && (
            <p className="text-[10px] text-red-400">
              {t("paywall.restoreError")}
            </p>
          )}
        </div>

        <div className="relative space-y-2.5">
          <label className="text-xs text-slate-500 block">{t("paywall.supportCode")}</label>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTokenState("idle");
              }}
              placeholder={t("paywall.accessCode")}
              className={`flex-1 bg-white/[0.04] border rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none ${
                tokenState === "invalid" || tokenState === "error"
                  ? "border-red-400/60 focus:border-red-400"
                  : tokenState === "valid"
                  ? "border-mint-400/60 focus:border-mint-400"
                  : "border-white/[0.08] focus:border-cyan-400"
              }`}
            />
            <Button
              variant="glass"
              onClick={submitToken}
              disabled={tokenState === "checking"}
              className="px-4 py-2.5 text-xs shrink-0"
            >
              {tokenState === "checking" ? t("paywall.checking") : t("paywall.verify")}
            </Button>
          </div>
          {tokenState === "invalid" && (
            <p className="text-[10px] text-red-400">{t("paywall.codeInvalid")}</p>
          )}
          {tokenState === "error" && (
            <p className="text-[10px] text-red-400">{t("paywall.codeError")}</p>
          )}
          {tokenState === "valid" && (
            <p className="text-[10px] text-mint-400">{t("paywall.codeValid")}</p>
          )}
          <p className="text-[9px] text-slate-400 leading-relaxed">
            {t("paywall.footerNote")}
          </p>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
