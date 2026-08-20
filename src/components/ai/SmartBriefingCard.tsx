import { useState } from "react";
import type { FinanceState } from "../../types";
import { BRIEFING_MODES, computeBriefing, type BriefingMode } from "../../lib/ai/briefing";
import { useTypewriter } from "../../hooks/useTypewriter";
import { GlassCard } from "../ui/GlassCard";
import { SegmentedControl } from "../ui/SegmentedControl";

export function SmartBriefingCard({ state }: { state: FinanceState }) {
  const [mode, setMode] = useState<BriefingMode>("safe-flow");
  const { headline, detail } = computeBriefing(state, mode);
  const { shown, done } = useTypewriter(detail, true, 10);

  return (
    <GlassCard strong className="relative overflow-hidden p-5 space-y-4">
      <div className="mesh-glow opacity-40" />
      <div className="relative flex items-start gap-3">
        <span
          className="text-lg leading-none shrink-0 mt-0.5 ai-pill-glow rounded-full h-8 w-8 flex items-center justify-center glass"
          aria-hidden
        >
          ✨
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold ai-gradient-text uppercase tracking-wider mb-1">
            AI Briefing
          </p>
          <p className="text-sm text-white font-medium leading-snug">{headline}</p>
          <p className="text-xs text-slate-400 leading-relaxed mt-1 min-h-[2.5em]">
            {shown}
            {!done && <span className="typewriter-caret h-3 align-middle" />}
          </p>
        </div>
      </div>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={BRIEFING_MODES}
        className="relative"
      />
    </GlassCard>
  );
}
