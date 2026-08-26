import { V2Card, V2Mark } from "../V2Card";
import { V2_SUBSCRIPTIONS, V2_SUBS_IMPACT, V2_SUBS_TOTAL } from "../mockData";

export function V2Subscriptions() {
  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-lg font-extrabold text-white">Subscriptions</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Impact on runway</p>
      </div>

      <V2Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-500">Total spend</p>
          <p className="text-lg font-extrabold tabular-nums text-white">{V2_SUBS_TOTAL}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500">Impact on runway</p>
          <p className="text-lg font-extrabold tabular-nums text-rose-400">{V2_SUBS_IMPACT}</p>
        </div>
      </V2Card>

      <V2Card className="p-4 space-y-1">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1 pb-2">
          Active subscriptions
        </p>
        {V2_SUBSCRIPTIONS.map((s) => (
          <div key={s.id} className="flex items-center gap-3 py-2.5">
            <V2Mark mark={s.mark} color={s.color} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{s.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{s.category}</p>
            </div>
            <span className="text-xs font-bold tabular-nums text-rose-400 shrink-0">{s.impact}</span>
          </div>
        ))}
      </V2Card>

      <V2Card className="p-5 text-center space-y-3">
        <p className="text-xs text-zinc-400">Reviewing subscriptions regularly can extend your runway.</p>
        <button className="w-full py-3 rounded-2xl text-sm font-bold text-[#04120E] transition-transform active:scale-[0.98]" style={{ background: "linear-gradient(90deg, #00F2FE, #10B981)", transitionTimingFunction: "var(--ease-spring)" }}>
          Review subscriptions
        </button>
      </V2Card>
    </div>
  );
}
