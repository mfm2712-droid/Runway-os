import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectionPoint } from "../lib/projection";
import type { Currency } from "../types";
import { formatCurrency } from "../lib/calculations";
import { track } from "../lib/analytics";

const W = 340;
const H = 180;
const PAD_X = 6;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;

function monthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-GB", { month: "short" });
}

export function BurnProjectionChart({
  points,
  zeroMonth,
  currency,
}: {
  points: ProjectionPoint[];
  zeroMonth: number | null;
  currency: Currency;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);
  const horizon = points[points.length - 1]?.month ?? 12;
  const sustainable = zeroMonth === null;
  const accent = sustainable ? "#34d399" : "#fb7185";

  const balances = points.map((p) => p.balance);
  const rawMin = Math.min(0, ...balances);
  const rawMax = Math.max(0, ...balances);
  const span = rawMax - rawMin || 1;
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.12;

  const x = (month: number) => PAD_X + (month / horizon) * (W - PAD_X * 2);
  const y = (balance: number) =>
    H - PAD_BOTTOM - ((balance - yMin) / (yMax - yMin)) * (H - PAD_TOP - PAD_BOTTOM);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.month)},${y(p.balance)}`).join(" ");
  const areaPath = `${linePath} L ${x(horizon)},${y(0)} L ${x(0)},${y(0)} Z`;
  const zeroY = y(0);

  const handlePointer = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((clientX - rect.left) / rect.width) * W;
    const month = Math.round(((relX - PAD_X) / (W - PAD_X * 2)) * horizon);
    setHoverMonth(Math.max(0, Math.min(horizon, month)));
  };

  const hovered = hoverMonth !== null ? points[hoverMonth] : null;

  return (
    <div className="space-y-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerUp={() => track({ name: "simulation_scrubbed" })}
        onPointerLeave={() => setHoverMonth(null)}
      >
        <defs>
          <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* zero baseline */}
        <line
          x1={PAD_X}
          y1={zeroY}
          x2={W - PAD_X}
          y2={zeroY}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        <path d={areaPath} fill="url(#burnFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${accent}88)` }}
        />

        {/* month ticks */}
        {points
          .filter((p) => p.month % 3 === 0)
          .map((p) => (
            <text
              key={p.month}
              x={x(p.month)}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(148,163,184,0.7)"
            >
              {monthLabel(p.month)}
            </text>
          ))}

        {/* zero-cash milestone marker */}
        {zeroMonth !== null && zeroMonth <= horizon && (
          <g>
            <line
              x1={x(zeroMonth)}
              y1={PAD_TOP}
              x2={x(zeroMonth)}
              y2={zeroY}
              stroke="#fb7185"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <circle
              cx={x(zeroMonth)}
              cy={zeroY}
              r={5}
              fill="#fb7185"
              style={{ filter: "drop-shadow(0 0 6px #fb7185cc)" }}
            />
          </g>
        )}

        {/* hover indicator */}
        {hovered && (
          <g>
            <line
              x1={x(hovered.month)}
              y1={PAD_TOP}
              x2={x(hovered.month)}
              y2={H - PAD_BOTTOM}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
            <circle cx={x(hovered.month)} cy={y(hovered.balance)} r={4} fill="white" />
          </g>
        )}
      </svg>

      <div className="h-8 flex items-center justify-center">
        {hovered ? (
          <p className="text-xs text-slate-300">
            <span className="text-slate-500">{monthLabel(hovered.month)} · </span>
            <span className="font-semibold tracking-tight tabular-nums text-white">
              {formatCurrency(hovered.balance, currency)}
            </span>
          </p>
        ) : (
          <p className="text-[10px] text-slate-600">Drag the scrub bar to inspect any month</p>
        )}
      </div>

      <input
        type="range"
        className="premium-slider"
        style={{ "--slider-pct": `${((hoverMonth ?? 0) / horizon) * 100}%`, "--slider-color": accent } as CSSProperties}
        min={0}
        max={horizon}
        step={1}
        value={hoverMonth ?? 0}
        onChange={(e) => setHoverMonth(Number(e.target.value))}
        onPointerUp={() => track({ name: "simulation_scrubbed" })}
        aria-label="Scrub timeline"
      />
    </div>
  );
}
