import type { CSSProperties } from "react";
import { DynamicIsland } from "./ui/DynamicIsland";
import { AdvisorFab } from "./ai/AdvisorFab";
import { EyeIcon, EyeOffIcon, GearIcon } from "./ui/Icons";
import type { FinanceState } from "../types";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function Header({
  state,
  onNavigate,
  onOpenAdvisor,
  onOpenSettings,
  stealthMode,
  onToggleStealth,
  logoSpeed = 6,
  logoDirection = "cw",
  logoPaused = false,
}: {
  state: FinanceState;
  onNavigate: (path: string) => void;
  onOpenAdvisor: () => void;
  onOpenSettings: () => void;
  stealthMode: boolean;
  onToggleStealth: () => void;
  /** Design Lab clone overrides — the logo is a raster asset, so only rotation is tunable. */
  logoSpeed?: number;
  logoDirection?: "cw" | "ccw";
  logoPaused?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="relative flex items-center justify-between gap-2">
      <button
        onClick={() => onNavigate("/")}
        className="flex items-center gap-2.5 shrink-0 group"
        aria-label="Runway OS home"
      >
        <span
          className="relative w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-full border border-white/10 transition-transform duration-200 group-active:scale-90"
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          <img
            src="/app-icon.png"
            alt="Runway OS Logo"
            className="w-[160%] h-[160%] max-w-none object-cover spin-el"
            style={
              {
                "--logo-speed": `${logoSpeed}s`,
                "--logo-dir": logoDirection === "ccw" ? "reverse" : "normal",
                "--logo-play": logoPaused ? "paused" : "running",
              } as CSSProperties
            }
          />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-white tracking-tight text-lg">Runway</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border border-cyan-400/40 text-cyan-300 bg-cyan-400/5">
            OS
          </span>
        </span>
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <DynamicIsland label={t("header.savedLocally")} />
        <button
          onClick={onToggleStealth}
          aria-label={stealthMode ? t("header.stealthOn") : t("header.stealthOff")}
          aria-pressed={stealthMode}
          title="Stealth Mode"
          className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-full glass active:scale-90 transition-transform duration-150 ${
            stealthMode ? "text-cyan-400" : "text-slate-400 hover:text-white"
          }`}
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          {stealthMode ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="Open Settings"
          title="Settings"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white active:scale-90 transition-transform duration-150"
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          <GearIcon width={16} height={16} />
        </button>
        <AdvisorFab state={state} onClick={onOpenAdvisor} />
      </div>
    </div>
  );
}
