import { useState, type ReactNode } from "react";
import { V2_BASELINE_RUNWAY_DAYS, V2_BASELINE_SAFE_SPEND } from "../mockData";
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from "../icons";

type Scenario = {
  id: string;
  title: string;
  amountPerMonth: number; // signed: positive = added cost, negative = savings
  runwayDeltaDays: number;
  perDayDelta: number;
  active: boolean;
};

const SEED_SCENARIOS: Scenario[] = [
  { id: "hire", title: "Hire 2 engineers", amountPerMonth: 24000, runwayDeltaDays: -14, perDayDelta: -712.5, active: false },
  { id: "buffer", title: "Increase runway buffer", amountPerMonth: 10000, runwayDeltaDays: -6, perDayDelta: 23.1, active: false },
  { id: "burn", title: "Reduce burn 10%", amountPerMonth: -3200, runwayDeltaDays: 6, perDayDelta: 216.4, active: false },
];

function deriveDeltas(amountPerMonth: number) {
  const k = amountPerMonth / 1000;
  return {
    runwayDeltaDays: Math.round(-k * 0.6),
    perDayDelta: Math.round(-k * 30 * 100) / 100,
  };
}

function amountLabel(amountPerMonth: number) {
  const abs = Math.abs(amountPerMonth).toLocaleString();
  return amountPerMonth >= 0 ? `+$${abs}/mo` : `−$${abs}/mo`;
}

function formatSignedMoney(n: number) {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `+$${abs}/day` : `−$${abs}/day`;
}

function formatSignedDays(n: number) {
  const abs = Math.abs(n);
  return n >= 0 ? `+${abs} days` : `−${abs} days`;
}

function Badge({ value, label }: { value: number; label: string }) {
  const good = value >= 0;
  return (
    <span
      className={`px-2 py-0.5 rounded font-mono text-xs ${
        good ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
      }`}
    >
      {label}
    </span>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#10151D]/90 border border-zinc-800/70 backdrop-blur-md rounded-2xl p-4 transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

function V2Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm"
        style={{ animation: "floatIn 0.25s var(--ease-spring)" }}
      >
        <Panel className="rounded-b-none sm:rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{title}</p>
            <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-white transition-colors">
              <XIcon size={16} />
            </button>
          </div>
          {children}
        </Panel>
      </div>
    </div>
  );
}

const IconBtn = ({ onClick, label, children }: { onClick: (e: React.MouseEvent) => void; label: string; children: ReactNode }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="h-7 w-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
  >
    {children}
  </button>
);

export function V2ProjectionLab() {
  const [scenarios, setScenarios] = useState<Scenario[]>(SEED_SCENARIOS);
  const [formOpen, setFormOpen] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [sign, setSign] = useState<"cost" | "savings">("cost");
  const [amount, setAmount] = useState("");

  const activeScenarios = scenarios.filter((s) => s.active);
  const totalRunwayDelta = activeScenarios.reduce((sum, s) => sum + s.runwayDeltaDays, 0);
  const totalPerDayDelta = activeScenarios.reduce((sum, s) => sum + s.perDayDelta, 0);
  const currentRunwayDays = V2_BASELINE_RUNWAY_DAYS + totalRunwayDelta;
  const currentSafeSpend = V2_BASELINE_SAFE_SPEND + totalPerDayDelta;

  const toggleActive = (id: string) =>
    setScenarios((list) => list.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));

  const deleteScenario = (id: string) => setScenarios((list) => list.filter((s) => s.id !== id));

  const openNewForm = () => {
    setEditingId(null);
    setTitle("");
    setSign("cost");
    setAmount("");
    setFormOpen(true);
  };

  const openEditForm = (s: Scenario) => {
    setEditingId(s.id);
    setTitle(s.title);
    setSign(s.amountPerMonth >= 0 ? "cost" : "savings");
    setAmount(String(Math.abs(s.amountPerMonth)));
    setFormOpen(true);
  };

  const submitForm = () => {
    const mag = parseFloat(amount);
    if (!title.trim() || !Number.isFinite(mag) || mag <= 0) return;
    const amountPerMonth = sign === "cost" ? mag : -mag;
    const { runwayDeltaDays, perDayDelta } = deriveDeltas(amountPerMonth);

    if (editingId) {
      setScenarios((list) =>
        list.map((s) =>
          s.id === editingId ? { ...s, title: title.trim(), amountPerMonth, runwayDeltaDays, perDayDelta } : s,
        ),
      );
    } else {
      setScenarios((list) => [
        ...list,
        {
          id: `custom-${Date.now()}`,
          title: title.trim(),
          amountPerMonth,
          runwayDeltaDays,
          perDayDelta,
          active: true,
        },
      ]);
    }
    setFormOpen(false);
  };

  const applyPreset = (kind: "dev" | "burn" | "buffer") => {
    if (kind === "burn" || kind === "buffer") {
      const id = kind === "burn" ? "burn" : "buffer";
      setScenarios((list) => list.map((s) => (s.id === id ? { ...s, active: true } : s)));
    } else {
      const amountPerMonth = 12000;
      const { runwayDeltaDays, perDayDelta } = deriveDeltas(amountPerMonth);
      setScenarios((list) => [
        ...list,
        {
          id: `custom-${Date.now()}`,
          title: "Hire 1 engineer",
          amountPerMonth,
          runwayDeltaDays,
          perDayDelta,
          active: true,
        },
      ]);
    }
    setWhatIfOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-extrabold text-white">Projection Lab</h1>
        <button
          onClick={() => setWhatIfOpen(true)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-teal-400/40 text-teal-300 hover:bg-teal-400/10 transition-colors"
        >
          What if?
        </button>
      </div>
      <p className="text-xs text-zinc-500 px-1 -mt-3">Model scenarios and see the impact before you decide.</p>

      <Panel>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current baseline</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-3xl font-black text-white tabular-nums">{currentRunwayDays} days</span>
          <span
            className="text-lg font-bold text-emerald-400 tabular-nums"
            style={{ textShadow: "0 0 16px rgba(16,185,129,0.45)" }}
          >
            ${currentSafeSpend.toFixed(2)} /day
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
          <span>Runway</span>
          <span>Safe to spend</span>
        </div>
        {activeScenarios.length > 0 && (
          <p className="text-[10px] text-teal-300 mt-3 pt-3 border-t border-zinc-800/60">
            {activeScenarios.length} scenario{activeScenarios.length === 1 ? "" : "s"} applied
          </p>
        )}
      </Panel>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Scenarios</p>
        {scenarios.map((s) => {
          const active = s.active;
          return (
            <div key={s.id} onClick={() => toggleActive(s.id)} role="button" tabIndex={0} className="cursor-pointer">
              <Panel
                className={active ? "border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.3)]" : ""}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{amountLabel(s.amountPerMonth)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <IconBtn
                      label="Edit scenario"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(s);
                      }}
                    >
                      <PencilIcon size={13} />
                    </IconBtn>
                    <IconBtn
                      label="Delete scenario"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScenario(s.id);
                      }}
                    >
                      <TrashIcon size={13} />
                    </IconBtn>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge value={s.runwayDeltaDays} label={formatSignedDays(s.runwayDeltaDays)} />
                  <Badge value={s.perDayDelta} label={formatSignedMoney(s.perDayDelta)} />
                  {active && <span className="ml-auto text-[10px] font-bold text-cyan-300">Applied</span>}
                </div>
              </Panel>
            </div>
          );
        })}
        {scenarios.length === 0 && (
          <p className="text-center text-xs text-zinc-500 py-6">No scenarios yet — add one below.</p>
        )}
      </div>

      <button
        onClick={openNewForm}
        className="w-full py-3.5 rounded-2xl text-sm font-bold border border-zinc-800/70 text-zinc-300 hover:border-teal-400/40 hover:text-teal-300 transition-colors flex items-center justify-center gap-1.5"
      >
        <PlusIcon size={14} /> New scenario
      </button>

      {formOpen && (
        <V2Modal title={editingId ? "Edit scenario" : "New scenario"} onClose={() => setFormOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Scenario title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cut SaaS tier"
                className="w-full bg-white/[0.04] border border-zinc-800/70 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
              />
            </div>
            <div className="flex items-center gap-1 rounded-full border border-zinc-800/70 bg-white/[0.02] p-1">
              <button
                onClick={() => setSign("cost")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  sign === "cost" ? "bg-rose-500/15 text-rose-400" : "text-zinc-500"
                }`}
              >
                + Cost
              </button>
              <button
                onClick={() => setSign("savings")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  sign === "savings" ? "bg-emerald-500/15 text-emerald-400" : "text-zinc-500"
                }`}
              >
                − Savings
              </button>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Monthly amount ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white/[0.04] border border-zinc-800/70 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
              />
            </div>
            <button
              onClick={submitForm}
              className="w-full py-3 rounded-2xl text-sm font-bold text-[#04120E] transition-transform active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg, #00F2FE, #10B981)", transitionTimingFunction: "var(--ease-spring)" }}
            >
              {editingId ? "Save scenario" : "Add scenario"}
            </button>
          </div>
        </V2Modal>
      )}

      {whatIfOpen && (
        <V2Modal title="What if?" onClose={() => setWhatIfOpen(false)}>
          <div className="space-y-2">
            <button
              onClick={() => applyPreset("dev")}
              className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800/70 hover:border-teal-400/40 transition-colors text-sm font-bold text-white"
            >
              + 1 dev
              <span className="block text-[10px] font-normal text-zinc-500 mt-0.5">Adds a new hiring scenario</span>
            </button>
            <button
              onClick={() => applyPreset("burn")}
              className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800/70 hover:border-teal-400/40 transition-colors text-sm font-bold text-white"
            >
              −10% burn
              <span className="block text-[10px] font-normal text-zinc-500 mt-0.5">Applies the burn-reduction scenario</span>
            </button>
            <button
              onClick={() => applyPreset("buffer")}
              className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800/70 hover:border-teal-400/40 transition-colors text-sm font-bold text-white"
            >
              +$10k buffer
              <span className="block text-[10px] font-normal text-zinc-500 mt-0.5">Applies the runway-buffer scenario</span>
            </button>
          </div>
        </V2Modal>
      )}
    </div>
  );
}
