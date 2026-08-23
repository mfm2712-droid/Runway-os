import { Button } from "./ui/Button";
import { playClick } from "../lib/audio";

export function BackupNudge({
  onExport,
  onSnooze,
}: {
  onExport: () => void;
  onSnooze: () => void;
}) {
  const snooze = () => {
    playClick();
    onSnooze();
  };

  return (
    <div className="relative w-full flex flex-col gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
      <p className="text-[11px] text-slate-300 leading-relaxed">
        Your data lives only on this device. We recommend downloading a backup every 7
        days so you don't lose it if you clear the browser or switch phones.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="glass" onClick={onExport} className="flex-1 py-2 text-[11px]">
          Download backup now
        </Button>
        <button
          onClick={snooze}
          className="shrink-0 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2"
        >
          Remind me in 7 days
        </button>
      </div>
    </div>
  );
}
