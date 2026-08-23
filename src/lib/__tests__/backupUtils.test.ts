import { describe, expect, it } from "vitest";
import { BACKUP_DUE_DAYS, formatBackupAge, isBackupDue } from "../backupUtils";

const DAY = 86400000;

describe("isBackupDue", () => {
  it("is due when no backup has ever been made", () => {
    expect(isBackupDue(null, null)).toBe(true);
  });

  it("is not due right after a backup", () => {
    const now = Date.now();
    expect(isBackupDue(new Date(now).toISOString(), null, now)).toBe(false);
  });

  it("is not due just under the threshold", () => {
    const now = Date.now();
    const lastBackupAt = new Date(now - (BACKUP_DUE_DAYS * DAY - 1000)).toISOString();
    expect(isBackupDue(lastBackupAt, null, now)).toBe(false);
  });

  it("is due once past the threshold", () => {
    const now = Date.now();
    const lastBackupAt = new Date(now - (BACKUP_DUE_DAYS * DAY + 1000)).toISOString();
    expect(isBackupDue(lastBackupAt, null, now)).toBe(true);
  });

  it("is not due while snoozed, even with no prior backup", () => {
    const now = Date.now();
    const snoozeUntil = new Date(now + DAY).toISOString();
    expect(isBackupDue(null, snoozeUntil, now)).toBe(false);
  });

  it("is due again once the snooze expires", () => {
    const now = Date.now();
    const snoozeUntil = new Date(now - 1000).toISOString();
    expect(isBackupDue(null, snoozeUntil, now)).toBe(true);
  });
});

describe("formatBackupAge", () => {
  it("reports never when no backup exists", () => {
    expect(formatBackupAge(null)).toBe("never");
  });

  it("reports today for a same-day backup", () => {
    const now = Date.now();
    expect(formatBackupAge(new Date(now - 1000).toISOString(), now)).toBe("today");
  });

  it("reports singular day", () => {
    const now = Date.now();
    expect(formatBackupAge(new Date(now - DAY).toISOString(), now)).toBe("1 day ago");
  });

  it("reports plural days", () => {
    const now = Date.now();
    expect(formatBackupAge(new Date(now - 3 * DAY).toISOString(), now)).toBe("3 days ago");
  });
});
