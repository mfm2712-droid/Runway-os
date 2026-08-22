import type { DailySeries } from "../lib/dailySeries";

const W = 280;
const H = 36;
const GAP = 2;

export function SafeSpendSparkline({ series }: { series: DailySeries }) {
  if (series.length < 2) return null;

  const barW = W / series.length - GAP;
  const maxVal = Math.max(1, ...series.map((e) => Math.max(e.spent, e.safeSpend)));

  return (
    <div className="w-full space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden>
        {series.map((entry, i) => {
          const barH = Math.max(1.5, (entry.spent / maxVal) * (H - 4));
          const x = i * (barW + GAP);
          const y = H - barH;
          const over = entry.spent > entry.safeSpend && entry.safeSpend > 0;
          return (
            <rect
              key={entry.date}
              x={x}
              y={y}
              width={Math.max(1, barW)}
              height={barH}
              rx={1}
              fill={over ? "#fb7185" : "#34d399"}
              opacity={i === series.length - 1 ? 1 : 0.55}
            />
          );
        })}
      </svg>
      <p className="text-[9px] text-slate-500 text-center">
        Daily spend, last {series.length} day{series.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
