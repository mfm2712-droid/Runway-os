import { Button } from "./ui/Button";
import { playClick } from "../lib/audio";

/**
 * A single, dismissible nudge toward exporting a local backup — shown from
 * the moment onboarding completes (covering "after onboarding," "after the
 * first expense," and "first Settings open" in one gate, since all three
 * always happen after onboarding) until the user dismisses it once. No
 * re-prompting after that — respects the dismissed flag permanently.
 */
export function BackupNudge({
  onExport,
  onDismiss,
}: {
  onExport: () => void;
  onDismiss: () => void;
}) {
  const dismiss = () => {
    playClick();
    onDismiss();
  };

  return (
    <div className="relative w-full flex flex-col gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
      <p className="text-[11px] text-slate-300 leading-relaxed">
        Your data lives on this device. Export a backup so you don't lose it if you clear
        the browser.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="glass" onClick={onExport} className="flex-1 py-2 text-[11px]">
          Export Backup
        </Button>
        <button
          onClick={dismiss}
          className="shrink-0 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
