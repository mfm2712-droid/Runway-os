import { Button } from "./ui/Button";
import { playClick } from "../lib/audio";
import { useLanguage } from "../lib/i18n/LanguageContext";

export function BackupNudge({
  onExport,
  onSnooze,
}: {
  onExport: () => void;
  onSnooze: () => void;
}) {
  const { t } = useLanguage();
  const snooze = () => {
    playClick();
    onSnooze();
  };

  return (
    <div className="relative w-full flex flex-col gap-2.5 px-4 py-3.5 rounded-2xl card-opaque">
      <p className="text-[11px] text-slate-300 leading-relaxed">
        {t("backupNudge.body")}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="glass" onClick={onExport} className="flex-1 py-2 text-[11px]">
          {t("backupNudge.downloadNow")}
        </Button>
        <button
          onClick={snooze}
          className="shrink-0 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2"
        >
          {t("backupNudge.remindLater")}
        </button>
      </div>
    </div>
  );
}
