import { useEffect, useState } from "react";
import type { FinanceState } from "../../types";
import { dailySafeSpend, formatCurrency } from "../../lib/calculations";

export function AdvisorFab({ state, onClick }: { state: FinanceState; onClick: () => void }) {
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShowTip(false), 3200);
    return () => window.clearTimeout(id);
  }, []);

  const insight = `${formatCurrency(dailySafeSpend(state), state.currency)} safe today — ask me anything`;

  return (
    <div className="relative group shrink-0">
      <div
        role="tooltip"
        className={`absolute right-0 top-[calc(100%+8px)] w-48 px-3 py-2 rounded-xl glass-strong ai-border-glow text-[10px] text-slate-200 leading-snug transition-opacity duration-300 pointer-events-none z-20 ${
          showTip ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {insight}
      </div>

      <button
        onClick={() => {
          setShowTip(false);
          onClick();
        }}
        aria-label="Open Money Copilot"
        title="Money Copilot"
        className="iridescent-border relative h-9 w-9 flex items-center justify-center rounded-full glass-strong text-base active:scale-90 transition-transform duration-150"
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      >
        <span aria-hidden>✨</span>
      </button>
    </div>
  );
}
