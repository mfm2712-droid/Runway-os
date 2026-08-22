import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Currency, Expense, ExpenseCategory, Subscription } from "../types";
import { CATEGORY_ICONS, CATEGORY_LABELS, CURRENCY_SYMBOLS } from "../types";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { ReceiptDropzone } from "./ai/ReceiptDropzone";
import { backdropVariants, panelVariants } from "../lib/motionPresets";
import { triggerHaptic } from "../lib/haptics";
import { playClick } from "../lib/audio";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function ExpenseModal({
  open,
  currency,
  initialMode,
  initialFile,
  initialText,
  onClose,
  onAdd,
  onAddSubscription,
}: {
  open: boolean;
  currency: Currency;
  initialMode?: "manual" | "scan";
  initialFile?: File;
  initialText?: string;
  onClose: () => void;
  onAdd: (expense: Omit<Expense, "id">) => void;
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
}) {
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) setMode(initialMode ?? "manual");
  }, [open, initialMode]);

  const amt = Number(amount);
  const valid = amt > 0;

  const resetAndClose = () => {
    setAmount("");
    setCategory("food");
    setDate(todayISO());
    setNote("");
    setMode("manual");
    onClose();
  };

  // Distinct from resetAndClose so a successful submit's own "pop" (played
  // by the Button below) doesn't get layered with a second click sound.
  const close = () => {
    playClick();
    resetAndClose();
  };

  const selectCategory = (c: ExpenseCategory) => {
    playClick();
    setCategory(c);
  };

  const submit = () => {
    if (!valid) return;
    triggerHaptic("success");
    const trimmedNote = note.trim();
    onAdd({ amount: amt, category, date, ...(trimmedNote ? { note: trimmedNote } : {}) });
    resetAndClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={close}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-sm glass-strong glass-inset rounded-t-[32px] md:rounded-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-6 max-h-[90vh] overflow-y-auto"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Add Expense"
          >
        <div className="mesh-glow opacity-60" />
        <div className="relative flex justify-center md:hidden -mt-1">
          <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
        </div>

        <div className="relative flex justify-between items-center">
          <h3 className="text-base font-semibold text-white">Add Expense</h3>
          <button
            onClick={close}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: "manual", label: "Manual" },
            { value: "scan", label: "✨ Scan Receipt" },
          ]}
          className="relative"
        />

        {mode === "scan" ? (
          <div className="relative">
            <ReceiptDropzone
              currency={currency}
              onAddExpense={onAdd}
              onAddSubscription={onAddSubscription}
              initialFile={initialFile}
              initialText={initialText}
            />
          </div>
        ) : (
          <>
            <div className="relative">
              <label className="text-xs text-slate-500 block mb-2">Amount</label>
              <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-4 focus-within:border-sky-500 transition-colors">
                <span className="text-2xl text-slate-500 mr-1">{CURRENCY_SYMBOLS[currency]}</span>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-transparent text-3xl font-bold tracking-tight text-white tabular-nums focus:outline-none glow-text"
                  style={{ color: valid ? "#38bdf8" : undefined }}
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs text-slate-500 block mb-2">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => selectCategory(c)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-3 border text-[10px] font-medium transition-all duration-150 active:scale-95 ${
                      category === c
                        ? "bg-sky-500/15 border-sky-500/60 text-sky-300 shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)]"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                    }`}
                    style={{ transitionTimingFunction: "var(--ease-spring)" }}
                  >
                    <span className="text-lg leading-none">{CATEGORY_ICONS[c]}</span>
                    {CATEGORY_LABELS[c].split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="text-xs text-slate-500 block mb-2">Merchant / Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Tesco"
                maxLength={80}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="relative">
              <label className="text-xs text-slate-500 block mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <Button
              variant="primary"
              sound="pop"
              onClick={submit}
              disabled={!valid}
              className="relative w-full py-4 text-sm"
            >
              Add Expense
            </Button>
          </>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
