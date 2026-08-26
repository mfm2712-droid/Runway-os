import { useState } from "react";
import { V2Card, V2Mark } from "../V2Card";
import { V2_TRANSACTIONS } from "../mockData";

type Filter = "all" | "cashflow" | "runway";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cashflow", label: "Cash flow" },
  { id: "runway", label: "Runway" },
];

export function V2History() {
  const [filter, setFilter] = useState<Filter>("all");

  const groups = V2_TRANSACTIONS.map((g) => ({
    ...g,
    items: filter === "all" ? g.items : g.items.filter((i) => i.kind === filter),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-extrabold text-white px-1">History</h1>

      <div className="flex items-center gap-1 rounded-full border border-zinc-800/60 bg-white/[0.02] p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${
              filter === f.id ? "bg-teal-400/15 text-teal-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <div key={g.group} className="space-y-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">{g.group}</p>
          <V2Card className="divide-y divide-zinc-800/60 px-4">
            {g.items.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <V2Mark mark={t.mark} color={t.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{t.subtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-extrabold tabular-nums ${
                      t.positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.amount}
                  </p>
                  <p className="text-[10px] text-zinc-500">{t.time}</p>
                </div>
              </div>
            ))}
          </V2Card>
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-center text-xs text-zinc-500 py-8">No transactions in this view.</p>
      )}
    </div>
  );
}
