import type { ReactNode } from "react";
import { V2Card } from "../V2Card";
import {
  CheckIcon,
  ChevronRightIcon,
  CloudIcon,
  DownloadIcon,
  GearIcon,
  HelpIcon,
  InfoCircleIcon,
  UploadIcon,
} from "../icons";

function Row({
  icon,
  label,
  sublabel,
  right,
}: {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  right?: ReactNode;
}) {
  return (
    <button className="w-full flex items-center gap-3 py-3.5 text-left">
      <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-white/[0.04] text-zinc-300">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{label}</p>
        {sublabel && <p className="text-[10px] text-zinc-500 truncate">{sublabel}</p>}
      </div>
      {right ?? <ChevronRightIcon size={16} className="text-zinc-600 shrink-0" />}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">{children}</p>;
}

export function V2Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-extrabold text-white px-1">Settings</h1>

      <div className="space-y-2">
        <SectionLabel>Data &amp; privacy</SectionLabel>
        <V2Card className="divide-y divide-zinc-800/60 px-4">
          <Row
            icon={<span className="text-teal-300"><CheckIcon size={15} /></span>}
            label="Local-first"
            sublabel="Your data stays on your device"
            right={
              <span className="h-6 w-6 flex items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                <CheckIcon size={13} />
              </span>
            }
          />
          <Row icon={<CloudIcon size={15} />} label="iCloud Backup" sublabel="Last backup: Today, 9:41 AM" />
          <Row icon={<DownloadIcon size={15} />} label="Export data" sublabel="Download your data as JSON" />
          <Row icon={<UploadIcon size={15} />} label="Import data" sublabel="Import from backup or JSON" />
        </V2Card>
      </div>

      <div className="space-y-2">
        <SectionLabel>Preferences</SectionLabel>
        <V2Card className="divide-y divide-zinc-800/60 px-4">
          <Row
            icon={<span className="text-xs font-bold">$</span>}
            label="Currency"
            right={<span className="text-xs text-zinc-500">USD ($)</span>}
          />
          <Row
            icon={<GearIcon size={15} />}
            label="Date format"
            right={<span className="text-xs text-zinc-500">May 13, 2025</span>}
          />
          <Row
            icon={<span className="text-xs">◐</span>}
            label="Dark mode"
            right={<span className="text-xs text-zinc-500">Always on</span>}
          />
        </V2Card>
      </div>

      <div className="space-y-2">
        <SectionLabel>About</SectionLabel>
        <V2Card className="divide-y divide-zinc-800/60 px-4">
          <Row icon={<HelpIcon size={15} />} label="Help & support" />
          <Row
            icon={<InfoCircleIcon size={15} />}
            label="About Runway OS"
            sublabel="Version 1.0.0"
            right={<span />}
          />
        </V2Card>
      </div>
    </div>
  );
}
