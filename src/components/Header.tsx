import { DynamicIsland } from "./ui/DynamicIsland";
import { AdvisorFab } from "./ai/AdvisorFab";
import { EyeIcon, EyeOffIcon, GearIcon } from "./ui/Icons";
import type { FinanceState } from "../types";

export function Header({
  state,
  onNavigate,
  onOpenAdvisor,
  onOpenSettings,
  stealthMode,
  onToggleStealth,
}: {
  state: FinanceState;
  onNavigate: (path: string) => void;
  onOpenAdvisor: () => void;
  onOpenSettings: () => void;
  stealthMode: boolean;
  onToggleStealth: () => void;
}) {
  return (
    <div className="relative flex items-center justify-between gap-2">
      <button
        onClick={() => onNavigate("/")}
        className="flex items-center gap-2.5 shrink-0 group"
        aria-label="Runway OS home"
      >
        <span
          className="w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-cyan-500/20 transition-transform duration-200 group-active:scale-90"
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          <img
            src="/app-icon.png"
            alt="Runway OS Logo"
            className="w-[160%] h-[160%] max-w-none object-cover animate-[spin_6s_linear_infinite] motion-reduce:animate-none"
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
        <DynamicIsland label="Saved locally" />
        <button
          onClick={onToggleStealth}
          aria-label={stealthMode ? "Turn off Stealth Mode" : "Turn on Stealth Mode"}
          aria-pressed={stealthMode}
          title="Stealth Mode"
          className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-full glass active:scale-90 transition-transform duration-150 ${
            stealthMode ? "text-sky-300" : "text-slate-400 hover:text-white"
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
