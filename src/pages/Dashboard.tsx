import { useEffect, useState } from "react";
import { HeroSpendCard } from "../components/HeroSpendCard";
import { StatPills } from "../components/StatPills";
import { ProjectionLab } from "../components/ProjectionLab";
import { SubscriptionTracker } from "../components/SubscriptionTracker";
import { ExpenseHistory } from "../components/ExpenseHistory";
import { ExpenseModal } from "../components/ExpenseModal";
import { BottomNav, type DashboardTab } from "../components/BottomNav";
import { AdvisorDrawer } from "../components/ai/AdvisorDrawer";
import { SmartBriefingCard } from "../components/ai/SmartBriefingCard";
import { SpendDonutChart } from "../components/SpendDonutChart";
import { CategoryDetailModal } from "../components/CategoryDetailModal";
import type { SpendSlice } from "../lib/spendBreakdown";
import { CooldownModule } from "../components/CooldownModule";
import { Header } from "../components/Header";
import { AmbientLogoAura } from "../components/AmbientLogoAura";
import { OnboardingModal } from "../components/OnboardingModal";
import { PaywallModal } from "../components/PaywallModal";
import { SettingsModal } from "../components/SettingsModal";
import { BackupNudge } from "../components/BackupNudge";
import { Button } from "../components/ui/Button";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useShortcutHandler } from "../hooks/useShortcutHandler";
import { useStripeVerification } from "../hooks/useStripeVerification";
import { uid } from "../lib/id";
import { computeTrialStatus, type DevOverride } from "../lib/trial";
import { track } from "../lib/analytics";
import { buildBackup, downloadBackup, isBackupDue, type BackupMeta } from "../lib/backupUtils";
import { BLANK_STREAK, updateStreak, type StreakData } from "../lib/streak";
import { upsertToday, type DailySeries } from "../lib/dailySeries";
import {
  STORAGE_KEY,
  ONBOARDED_KEY,
  TRIAL_STARTED_KEY,
  LICENSE_KEY,
  DEV_OVERRIDE_KEY,
  STREAK_KEY,
  DAILY_SERIES_KEY,
  LAST_BACKUP_AT_KEY,
  BACKUP_SNOOZE_UNTIL_KEY,
} from "../lib/storageKeys";
import type { Currency, Expense, FinanceState, Subscription, WishlistItem } from "../types";
import { useLanguage } from "../lib/i18n/LanguageContext";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

const BLANK_STATE: FinanceState = {
  cashBalance: 0,
  fixedMonthlyOutflows: 0,
  safetyBuffer: 0,
  paydayDay: undefined,
  currency: "GBP",
  subscriptions: [],
  expenses: [],
  wishlist: [],
};

const DEMO_STATE: FinanceState = {
  cashBalance: 6500,
  fixedMonthlyOutflows: 1350,
  safetyBuffer: 300,
  paydayDay: 28,
  currency: "GBP",
  subscriptions: [
    { id: "sub-1", name: "Gym Membership", amount: 45, renewsOn: 1, flaggedUnused: false },
    {
      id: "sub-2",
      name: "Cloud Storage & Tools",
      amount: 29,
      renewsOn: 15,
      flaggedUnused: true,
      flaggedSince: daysAgoISO(52),
    },
    {
      id: "sub-3",
      name: "Media Subscriptions",
      amount: 15.99,
      renewsOn: 28,
      flaggedUnused: true,
      flaggedSince: daysAgoISO(61),
    },
  ],
  expenses: [
    { id: "exp-seed-1", amount: 34.2, category: "food", date: daysAgoISO(2).slice(0, 10) },
    { id: "exp-seed-2", amount: 18.5, category: "transport", date: daysAgoISO(4).slice(0, 10) },
    { id: "exp-seed-3", amount: 62, category: "shopping", date: daysAgoISO(6).slice(0, 10) },
  ],
  wishlist: [
    {
      id: "wish-seed-1",
      name: "Noise-cancelling headphones",
      price: 180,
      reason: "Saw a deal, don't actually need them yet",
      addedAt: daysAgoISO(0.85),
    },
  ],
};

export function Dashboard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useLanguage();
  const [state, setState] = useLocalStorage<FinanceState>(STORAGE_KEY, BLANK_STATE);
  const [onboarded, setOnboarded] = useLocalStorage<boolean>(
    ONBOARDED_KEY,
    typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) !== null,
  );
  // Empty until onboarding actually completes (or demo data loads) — merely
  // loading /app (e.g. an unfinished onboarding, a bookmark, a PWA
  // shortcut) must not start the clock on a trial the user hasn't begun.
  const [trialStartedAt, setTrialStartedAt] = useLocalStorage<string>(TRIAL_STARTED_KEY, "");
  const [licenseKey, setLicenseKey] = useLocalStorage<string | null>(LICENSE_KEY, null);
  const [devOverride, setDevOverride] = useLocalStorage<DevOverride>(DEV_OVERRIDE_KEY, null);
  const { modalOpen, modalMode, sharedInput, openManual, close: closeExpenseModal } =
    useShortcutHandler();
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailBucket, setDetailBucket] = useState<SpendSlice["key"] | null>(null);
  const [tuneOpen, setTuneOpen] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [stealthMode, setStealthMode] = useLocalStorage<boolean>("runway-os:stealthMode", false);
  const [savedTotal, setSavedTotal] = useLocalStorage<number>("runway-os:saved-total", 0);
  const [streak, setStreak] = useLocalStorage<StreakData>(STREAK_KEY, BLANK_STREAK);
  const [dailySeries, setDailySeries] = useLocalStorage<DailySeries>(DAILY_SERIES_KEY, []);
  const [lastBackupAt, setLastBackupAt] = useLocalStorage<string | null>(LAST_BACKUP_AT_KEY, null);
  const [backupSnoozeUntil, setBackupSnoozeUntil] = useLocalStorage<string | null>(
    BACKUP_SNOOZE_UNTIL_KEY,
    null,
  );

  // Refresh the streak and today's sparkline entry once per app open — safe
  // to call repeatedly since both are idempotent for a day already recorded.
  useEffect(() => {
    if (!onboarded) return;
    setStreak((s) => updateStreak(state, s));
    setDailySeries((series) => upsertToday(series, state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded]);

  // Re-render periodically so the trial countdown stays accurate without
  // requiring user interaction.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { checkoutBanner } = useStripeVerification(licenseKey, setLicenseKey);

  const trialStatus = computeTrialStatus(trialStartedAt, licenseKey, devOverride);

  const patch = (p: Partial<FinanceState>) => setState((s) => ({ ...s, ...p }));

  const openPaywall = (trigger: "trial_expired" | "manual") => {
    track({ name: "paywall_viewed", trigger });
    setPaywallOpen(true);
  };

  const openAdvisor = () => {
    if (trialStatus.kind === "expired") {
      openPaywall("trial_expired");
      return;
    }
    setAdvisorOpen(true);
  };

  const activateLicense = (key: string) => setLicenseKey(key);

  const changeCurrency = (currency: Currency) => patch({ currency });

  const backupMeta: BackupMeta = { onboarded, trialStartedAt, licenseKey };

  const exportBackup = () => {
    downloadBackup(buildBackup(state, backupMeta));
    setLastBackupAt(new Date().toISOString());
    setBackupSnoozeUntil(null);
  };

  const snoozeBackup = () => setBackupSnoozeUntil(new Date(Date.now() + 7 * 86400000).toISOString());

  const backupDue = onboarded && isBackupDue(lastBackupAt, backupSnoozeUntil);

  const restoreBackup = (restoredState: FinanceState, meta: BackupMeta) => {
    setState(restoredState);
    setOnboarded(meta.onboarded);
    setTrialStartedAt(meta.trialStartedAt);
    setLicenseKey(meta.licenseKey);
  };

  const startTrialIfNeeded = () => {
    if (!trialStartedAt) {
      setTrialStartedAt(new Date().toISOString());
      track({ name: "trial_started" });
    }
  };

  const completeOnboarding = (result: { cashBalance: number; fixedMonthlyOutflows: number; paydayDay: number }) => {
    patch(result);
    setOnboarded(true);
    startTrialIfNeeded();
  };

  const loadDemoData = () => {
    setState(DEMO_STATE);
    setOnboarded(true);
    startTrialIfNeeded();
  };

  const addSubscription = (sub: Omit<Subscription, "id">) =>
    setState((s) => ({ ...s, subscriptions: [...s.subscriptions, { ...sub, id: uid() }] }));

  const removeSubscription = (id: string) =>
    setState((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== id) }));

  // Cancelling/deleting a tracked subscription banks its monthly cost into a
  // lifetime "recovered savings" counter — the Subscriptions tab celebrates
  // the running annualized total.
  const cancelSubscription = (id: string) => {
    const sub = state.subscriptions.find((x) => x.id === id);
    if (sub) setSavedTotal((t) => t + sub.amount);
    removeSubscription(id);
  };

  const updateSubscription = (
    id: string,
    patch: { name: string; amount: number; renewsOn: number },
  ) =>
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const toggleSubscriptionFlag = (id: string) =>
    setState((s) => ({
      ...s,
      subscriptions: s.subscriptions.map((x) =>
        x.id === id
          ? {
              ...x,
              flaggedUnused: !x.flaggedUnused,
              flaggedSince: !x.flaggedUnused ? new Date().toISOString() : undefined,
            }
          : x,
      ),
    }));

  const addExpense = (expense: Omit<Expense, "id">) => {
    const nextState = { ...state, expenses: [...state.expenses, { ...expense, id: uid() }] };
    setState(nextState);
    setDailySeries((series) => upsertToday(series, nextState));
  };

  const removeExpense = (id: string) =>
    setState((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== id) }));

  const addWishlistItem = (item: Omit<WishlistItem, "id" | "addedAt">) =>
    setState((s) => ({
      ...s,
      wishlist: [...s.wishlist, { ...item, id: uid(), addedAt: new Date().toISOString() }],
    }));

  const removeWishlistItem = (id: string) =>
    setState((s) => ({ ...s, wishlist: s.wishlist.filter((x) => x.id !== id) }));

  const buySafely = (item: WishlistItem) => {
    addExpense({ amount: item.price, category: "shopping", date: todayISO(), note: item.name });
    removeWishlistItem(item.id);
  };

  return (
    <div className="relative text-slate-100 min-h-screen overflow-x-hidden">
      <div className="mesh-glow" />

      <main className="relative max-w-md mx-auto min-h-screen px-4 md:px-6 pt-6 pb-28 space-y-6">
        <AmbientLogoAura />
        <Header
          state={state}
          onNavigate={onNavigate}
          onOpenAdvisor={openAdvisor}
          onOpenSettings={() => setSettingsOpen(true)}
          stealthMode={stealthMode}
          onToggleStealth={() => setStealthMode((v) => !v)}
        />

        {checkoutBanner === "verifying" && (
          <div className="relative w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-slate-300">
            {t("dashboard.confirmingSubscription")}
          </div>
        )}
        {checkoutBanner === "success" && (
          <div className="relative w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            {t("dashboard.subscriptionActive")}
          </div>
        )}
        {checkoutBanner === "error" && (
          <div className="relative w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            {t("dashboard.paymentError")}
          </div>
        )}

        {trialStatus.kind === "trial" && (
          <button
            onClick={() => openPaywall("manual")}
            className="relative w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-400/10 to-sky-400/10 border border-violet-400/25 text-violet-200 active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {t("dashboard.proTrial", { hours: Math.max(1, Math.ceil(trialStatus.hoursLeft)) })}
          </button>
        )}

        {trialStatus.kind === "expired" && (
          <button
            onClick={() => openPaywall("trial_expired")}
            className="relative w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            {t("dashboard.trialExpired")}
          </button>
        )}

        {backupDue && <BackupNudge onExport={exportBackup} onSnooze={snoozeBackup} />}

        <div key={tab} className="space-y-5" style={{ animation: "floatIn 0.35s var(--ease-spring)" }}>
          {tab === "overview" && (
            <>
              <SmartBriefingCard state={state} />
              <HeroSpendCard
                state={state}
                onChange={patch}
                stealth={stealthMode}
                streak={streak}
                series={dailySeries}
                tuneOpen={tuneOpen}
                onOpenTune={() => setTuneOpen(true)}
                onCloseTune={() => setTuneOpen(false)}
              />
              <StatPills state={state} stealth={stealthMode} />
              <SpendDonutChart
                state={state}
                stealth={stealthMode}
                onOpenDetail={setDetailBucket}
                onAddExpense={openManual}
              />
              <CooldownModule
                wishlist={state.wishlist}
                state={state}
                onAdd={addWishlistItem}
                onBuySafely={buySafely}
                onDiscard={(item) => removeWishlistItem(item.id)}
              />
            </>
          )}

          {tab === "simulate" && (
            trialStatus.kind === "expired" ? (
              <div className="relative">
                <div className="pointer-events-none select-none blur-md opacity-50">
                  <ProjectionLab state={state} onApply={patch} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="glass-strong rounded-3xl p-6 text-center space-y-3 max-w-xs">
                    <p className="text-2xl" aria-hidden>
                      🔒
                    </p>
                    <p className="text-sm font-semibold text-white">{t("dashboard.projectionLabProFeature")}</p>
                    <p className="text-xs text-slate-400">
                      {t("dashboard.trialEndedUnlock")}
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => openPaywall("trial_expired")}
                      className="w-full py-3 text-sm"
                    >
                      {t("dashboard.unlockFullAccess")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <ProjectionLab state={state} onApply={patch} />
            )
          )}

          {tab === "subscriptions" && (
            <SubscriptionTracker
              subscriptions={state.subscriptions}
              state={state}
              savedTotal={savedTotal}
              onAdd={addSubscription}
              onRemove={cancelSubscription}
              onToggleFlag={toggleSubscriptionFlag}
              onUpdate={updateSubscription}
            />
          )}

          {tab === "history" && (
            <ExpenseHistory
              expenses={state.expenses}
              currency={state.currency}
              onRemove={removeExpense}
              onAddExpense={openManual}
              stealth={stealthMode}
            />
          )}
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} onQuickAdd={openManual} />
      <ExpenseModal
        open={modalOpen}
        currency={state.currency}
        initialMode={modalMode}
        initialFile={sharedInput?.file}
        initialText={sharedInput?.text}
        onClose={closeExpenseModal}
        onAdd={addExpense}
        onAddSubscription={addSubscription}
      />
      <AdvisorDrawer open={advisorOpen} onClose={() => setAdvisorOpen(false)} state={state} />
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onActivate={activateLicense}
        licenseKey={licenseKey}
        onLicenseInvalid={() => setLicenseKey(null)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onChangeCurrency={changeCurrency}
        trialStatus={trialStatus}
        devOverride={devOverride}
        onChangeDevOverride={setDevOverride}
        meta={backupMeta}
        onRestore={restoreBackup}
        onLicenseInvalid={() => setLicenseKey(null)}
        onNavigate={onNavigate}
        lastBackupAt={lastBackupAt}
        onExport={exportBackup}
      />
      <CategoryDetailModal
        bucketKey={detailBucket}
        state={state}
        onClose={() => setDetailBucket(null)}
        onRemoveExpense={removeExpense}
        onEditFixedCosts={() => {
          setDetailBucket(null);
          setTuneOpen(true);
        }}
      />

      <OnboardingModal
        open={!onboarded}
        currency={state.currency}
        onComplete={completeOnboarding}
        onLoadDemo={loadDemoData}
      />
    </div>
  );
}
