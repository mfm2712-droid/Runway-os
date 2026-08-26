import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Currency, FinanceState } from "../types";
import { CURRENCY_SYMBOLS } from "../types";
import type { DevOverride, TrialStatus } from "../lib/trial";
import {
  formatBackupAge,
  parseBackupFile,
  readFileAsText,
  type BackupMeta,
} from "../lib/backupUtils";
import { downloadExpensesCsv } from "../lib/csvExport";
import { isAudioMuted, playClick, setAudioMuted } from "../lib/audio";
import { Button } from "./ui/Button";
import { backdropVariants, panelVariants } from "../lib/motionPresets";
import { useSyncSubscriptionCheck } from "../hooks/useSyncSubscriptionCheck";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { LANGUAGES, type Lang } from "../lib/i18n/translations";

const CURRENCIES: Currency[] = ["GBP", "EUR", "USD"];

const DEV_OVERRIDE_KEYS: { value: DevOverride; labelKey: string }[] = [
  { value: null, labelKey: "settings.devReal" },
  { value: "trial", labelKey: "settings.devTrial" },
  { value: "expired", labelKey: "settings.devExpired" },
  { value: "pro", labelKey: "settings.devPro" },
];

export function SettingsModal({
  open,
  onClose,
  state,
  onChangeCurrency,
  trialStatus,
  devOverride,
  onChangeDevOverride,
  meta,
  onRestore,
  onLicenseInvalid,
  onNavigate,
  lastBackupAt,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
  onChangeCurrency: (c: Currency) => void;
  trialStatus: TrialStatus;
  devOverride: DevOverride;
  onChangeDevOverride: (v: DevOverride) => void;
  meta: BackupMeta;
  onRestore: (state: FinanceState, meta: BackupMeta) => void;
  onLicenseInvalid: () => void;
  onNavigate: (path: string) => void;
  lastBackupAt: string | null;
  onExport: () => void;
}) {
  useSyncSubscriptionCheck(open, meta.licenseKey, onLicenseInvalid);
  const { t, lang, setLang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "error" | "success">("idle");
  const [restoreMessage, setRestoreMessage] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [audioMuted, setAudioMutedState] = useState(() => isAudioMuted());
  const reduceMotion = useReducedMotion();

  const handleExportCsv = () => downloadExpensesCsv(state);
  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    setAudioMutedState(next);
    if (!next) playClick();
  };

  const dismiss = () => {
    playClick();
    onClose();
  };

  const openBillingPortal = async () => {
    if (!meta.licenseKey) return;
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: meta.licenseKey }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      setPortalError(t("settings.billingError"));
      setPortalLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const payload = parseBackupFile(text);
      onRestore(payload.state, payload.meta);
      setRestoreStatus("success");
      setRestoreMessage(t("settings.restoreSuccess", { date: payload.exportedAt.slice(0, 10) }));
    } catch (e) {
      setRestoreStatus("error");
      setRestoreMessage(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
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
            aria-label={t("settings.title")}
          >
        <div className="mesh-glow opacity-60" />

        <div className="relative flex justify-between items-center">
          <h3 className="text-base font-semibold text-white">{t("settings.title")}</h3>
          <button
            onClick={dismiss}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {t("settings.planStatus")}
          </p>
          {trialStatus.kind === "pro" && (
            <p className="text-sm text-mint-400 font-semibold">{t("settings.proActive")}</p>
          )}
          {trialStatus.kind === "trial" && (
            <p className="text-sm text-violet-300 font-semibold">
              {t("settings.proTrial", { hours: Math.max(1, Math.ceil(trialStatus.hoursLeft)) })}
            </p>
          )}
          {trialStatus.kind === "expired" && (
            <p className="text-sm text-red-400 font-semibold">{t("settings.trialExpired")}</p>
          )}
          {trialStatus.kind === "pro" && meta.licenseKey?.startsWith("cus_") && (
            <div className="pt-1">
              <Button
                variant="glass"
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="w-full py-2.5 text-xs"
              >
                {portalLoading ? t("settings.openingBilling") : t("settings.manageBilling")}
              </Button>
              {portalError && <p className="text-[10px] text-red-400 mt-1.5">{portalError}</p>}
            </div>
          )}
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">{t("settings.currency")}</label>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => onChangeCurrency(c)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-3 border text-xs font-medium transition-all duration-150 active:scale-95 ${
                  state.currency === c
                    ? "bg-cyan-400/15 border-cyan-400/60 text-cyan-400"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                <span className="text-lg leading-none">{CURRENCY_SYMBOLS[c]}</span>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">{t("settings.language")}</label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value as Lang)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 border text-xs font-medium transition-all duration-150 active:scale-95 ${
                  lang === l.value
                    ? "bg-cyan-400/15 border-cyan-400/60 text-cyan-400"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">{t("settings.tapSounds")}</label>
            <button
              onClick={toggleAudio}
              aria-pressed={!audioMuted}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                audioMuted ? "bg-white/[0.1]" : "bg-cyan-400"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  audioMuted ? "translate-x-0" : "translate-x-5"
                }`}
                style={{ transitionTimingFunction: "var(--ease-spring)" }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-slate-400">
              {audioMuted ? t("settings.soundOff") : t("settings.soundOn")}
            </p>
            {!audioMuted && (
              <button
                onClick={playClick}
                className="shrink-0 text-[10px] font-medium text-cyan-400 hover:text-cyan-400 transition-colors"
              >
                {t("settings.testSound")}
              </button>
            )}
          </div>
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">{t("settings.data")}</label>
          <p className="text-[10px] text-slate-400 -mt-1">
            {t("settings.emailBackupLine")}
          </p>
          <p className="text-[10px] text-slate-500">
            {t("settings.lastBackup", { age: formatBackupAge(lastBackupAt, Date.now(), lang) })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={onExport} className="py-3 text-xs">
              {t("settings.exportBackup")}
            </Button>
            <Button
              variant="glass"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 text-xs"
            >
              {t("settings.restoreBackup")}
            </Button>
          </div>
          <Button variant="glass" onClick={handleExportCsv} className="w-full py-3 text-xs">
            {t("settings.exportCsv")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {restoreStatus === "success" && (
            <p className="text-[10px] text-mint-400">✓ {restoreMessage}</p>
          )}
          {restoreStatus === "error" && <p className="text-[10px] text-red-400">{restoreMessage}</p>}
        </div>

        <div className="relative space-y-2">
          <label className="text-xs text-slate-500 block">{t("settings.legalSupport")}</label>
          <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
            <button
              onClick={() => onNavigate("/privacy")}
              className="hover:text-white transition-colors underline underline-offset-2 decoration-white/20"
            >
              {t("settings.privacy")}
            </button>
            <button
              onClick={() => onNavigate("/terms")}
              className="hover:text-white transition-colors underline underline-offset-2 decoration-white/20"
            >
              {t("settings.terms")}
            </button>
            <a
              href="mailto:support@runwayos.app"
              className="hover:text-white transition-colors underline underline-offset-2 decoration-white/20"
            >
              support@runwayos.app
            </a>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className="relative space-y-2 pt-3 border-t border-white/[0.08]">
            <label className="text-xs text-slate-500 block">{t("settings.devMode")}</label>
            <div className="grid grid-cols-2 gap-2">
              {DEV_OVERRIDE_KEYS.map((o) => (
                <button
                  key={String(o.value)}
                  onClick={() => onChangeDevOverride(o.value)}
                  className={`rounded-xl py-2.5 text-[11px] font-medium border transition-colors ${
                    devOverride === o.value
                      ? "bg-orange-400/15 border-orange-400/50 text-orange-400"
                      : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                  }`}
                >
                  {t(o.labelKey)}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed">
              {t("settings.devHelp")}
            </p>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
