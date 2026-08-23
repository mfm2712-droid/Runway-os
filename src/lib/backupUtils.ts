import type { FinanceState } from "../types";
import { DICTIONARIES, type Lang } from "./i18n/translations";

export interface BackupMeta {
  onboarded: boolean;
  trialStartedAt: string;
  licenseKey: string | null;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  state: FinanceState;
  meta: BackupMeta;
}

export function buildBackup(state: FinanceState, meta: BackupMeta): BackupPayload {
  return { version: 1, exportedAt: new Date().toISOString(), state, meta };
}

export const BACKUP_DUE_DAYS = 7;

export function isBackupDue(
  lastBackupAt: string | null,
  snoozeUntil: string | null,
  now: number = Date.now(),
): boolean {
  if (snoozeUntil && new Date(snoozeUntil).getTime() > now) return false;
  if (!lastBackupAt) return true;
  return now - new Date(lastBackupAt).getTime() > BACKUP_DUE_DAYS * 86400000;
}

export function formatBackupAge(
  lastBackupAt: string | null,
  now: number = Date.now(),
  lang: Lang = "en",
): string {
  const dict = DICTIONARIES[lang];
  if (!lastBackupAt) return dict["backupAge.never"];
  const days = Math.floor((now - new Date(lastBackupAt).getTime()) / 86400000);
  if (days <= 0) return dict["backupAge.today"];
  if (days === 1) return dict["backupAge.oneDay"];
  return dict["backupAge.days"].replace("{count}", String(days));
}

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `runway-os-backup-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isFinanceState(value: unknown): value is FinanceState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.cashBalance === "number" &&
    typeof v.fixedMonthlyOutflows === "number" &&
    typeof v.safetyBuffer === "number" &&
    typeof v.currency === "string" &&
    Array.isArray(v.subscriptions) &&
    Array.isArray(v.expenses) &&
    Array.isArray(v.wishlist)
  );
}

/** Throws with a user-facing message if the file isn't a recognizable backup. */
export function parseBackupFile(text: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("That doesn't look like a Runway OS backup file.");
  }
  const p = parsed as Record<string, unknown>;
  if (!isFinanceState(p.state)) {
    throw new Error("Backup file is missing or has an invalid 'state' section.");
  }
  const meta = (p.meta as Record<string, unknown>) ?? {};
  return {
    version: 1,
    exportedAt: typeof p.exportedAt === "string" ? p.exportedAt : new Date().toISOString(),
    state: p.state,
    meta: {
      onboarded: typeof meta.onboarded === "boolean" ? meta.onboarded : true,
      trialStartedAt:
        typeof meta.trialStartedAt === "string" ? meta.trialStartedAt : new Date().toISOString(),
      licenseKey: typeof meta.licenseKey === "string" ? meta.licenseKey : null,
    },
  };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
