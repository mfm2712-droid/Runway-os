import { motion } from "motion/react";
import { ClockIcon, DialIcon, HomeIcon, PlusIcon, TagIcon } from "./ui/Icons";
import { springTransition } from "../lib/motionPresets";
import { triggerHaptic } from "../lib/haptics";
import { playClick } from "../lib/audio";

export type DashboardTab = "overview" | "simulate" | "subscriptions" | "history";

const TABS: { id: DashboardTab; label: string; icon: typeof HomeIcon }[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "simulate", label: "Simulate", icon: DialIcon },
  { id: "subscriptions", label: "Subs", icon: TagIcon },
  { id: "history", label: "History", icon: ClockIcon },
];

export function BottomNav({
  active,
  onChange,
  onQuickAdd,
}: {
  active: DashboardTab;
  onChange: (t: DashboardTab) => void;
  onQuickAdd: () => void;
}) {
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  const changeTab = (t: DashboardTab) => {
    if (t !== active) {
      triggerHaptic("light");
      playClick();
    }
    onChange(t);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] px-4 pointer-events-none">
      <div className="relative pointer-events-auto">
        <button
          onClick={() => {
            triggerHaptic("medium");
            playClick();
            onQuickAdd();
          }}
          aria-label="Add expense"
          className="absolute z-20 left-1/2 -translate-x-1/2 -top-7 h-14 w-14 rounded-full bg-gradient-to-b from-sky-400 to-sky-500 flex items-center justify-center text-obsidian-950 shadow-[0_0_0_6px_rgba(5,5,10,1),0_8px_28px_-6px_rgba(56,189,248,0.7)] active:scale-90 transition-transform duration-150 [transition-timing-function:var(--ease-spring)]"
        >
          <PlusIcon width={26} height={26} strokeWidth={2.2} />
        </button>

        <div className="relative z-10 flex items-center gap-1 rounded-full glass-strong glass-inset px-2 py-2">
          {leftTabs.map((t) => (
            <TabButton key={t.id} tab={t} active={active === t.id} onClick={() => changeTab(t.id)} />
          ))}
          <span className="w-14" aria-hidden />
          {rightTabs.map((t) => (
            <TabButton key={t.id} tab={t} active={active === t.id} onClick={() => changeTab(t.id)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: DashboardTab; label: string; icon: typeof HomeIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-full transition-all duration-200 active:scale-90 ${
        active ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
      }`}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
    >
      <Icon
        width={20}
        height={20}
        style={active ? { filter: "drop-shadow(0 0 6px rgba(56,189,248,0.8))" } : undefined}
      />
      <span className="text-[9px] font-medium">{tab.label}</span>
      {active && (
        <motion.span
          layoutId="bottomNavIndicator"
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-sky-400"
          transition={springTransition}
        />
      )}
    </button>
  );
}
