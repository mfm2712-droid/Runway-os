import type { Currency } from "../../types";
import { promptChips } from "../../lib/ai/simulate";

export function PromptChips({
  currency,
  onPick,
}: {
  currency: Currency;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="space-y-2">
      {promptChips(currency).map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPick(prompt)}
          className="w-full text-left text-xs text-slate-300 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-violet-400/40 hover:bg-white/[0.05] active:scale-[0.98] transition-all duration-150"
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
