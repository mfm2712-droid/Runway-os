import { useEffect, useRef, useState } from "react";
import type { Currency, Expense, Subscription } from "../../types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "../../types";
import { formatCurrency } from "../../lib/calculations";
import { parseReceipt, ReceiptParseError, type ReceiptParseResult } from "../../lib/ai/client";
import { triggerHaptic } from "../../lib/haptics";
import { playPop } from "../../lib/audio";
import { SkeletonBlock, SkeletonLines } from "./Skeleton";

type Stage = "idle" | "analyzing" | "result" | "error";

const LOW_CONFIDENCE = 0.5;

export function ReceiptDropzone({
  currency,
  onAddExpense,
  onAddSubscription,
  initialFile,
  initialText,
}: {
  currency: Currency;
  onAddExpense: (expense: Omit<Expense, "id">) => void;
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
  initialFile?: File;
  initialText?: string;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState<ReceiptParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runParse = async (input: { file?: File; text?: string }) => {
    setStage("analyzing");
    if (input.file) setPreviewUrl(URL.createObjectURL(input.file));
    try {
      const parsed = await parseReceipt(input);
      setResult(parsed);
      setStage("result");
    } catch (e) {
      setErrorMessage(
        e instanceof ReceiptParseError ? e.message : "Something went wrong reading that receipt.",
      );
      setStage("error");
    }
  };

  // A shared image/text (from the OS share sheet, via the PWA share target)
  // arrives as props once — run it straight through the same parse path a
  // manual drop would use.
  useEffect(() => {
    if (initialFile || initialText) runParse({ file: initialFile, text: initialText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      runParse({ file });
      return;
    }
    const text = e.dataTransfer.getData("text/plain");
    if (text) runParse({ text });
  };

  const reset = () => {
    setStage("idle");
    setResult(null);
    setErrorMessage("");
    setPreviewUrl(null);
    setPastedText("");
    setConfirmed(false);
  };

  const confirmAdd = (asSubscription: boolean) => {
    if (!result) return;
    triggerHaptic("success");
    playPop();
    if (asSubscription) {
      onAddSubscription({
        name: result.merchant,
        amount: result.amount,
        renewsOn: new Date(result.date).getDate(),
        flaggedUnused: false,
      });
    } else {
      onAddExpense({ amount: result.amount, category: result.category, date: result.date, note: result.merchant });
    }
    setConfirmed(true);
  };

  if (confirmed && result) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center animate-[floatIn_0.25s_var(--ease-spring)]">
        <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl">
          ✓
        </div>
        <p className="text-sm text-white font-medium">Logged {result.merchant}</p>
        <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300">
          Scan another
        </button>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center animate-[floatIn_0.25s_var(--ease-spring)]">
        <div className="h-12 w-12 rounded-full bg-rose-500/15 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <p className="text-sm text-white font-medium max-w-[220px]">{errorMessage}</p>
        <button
          onClick={reset}
          className="text-xs px-4 py-2 rounded-full glass text-slate-300 hover:text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (stage === "result" && result) {
    const lowConfidence = result.isLive && result.confidenceScore < LOW_CONFIDENCE;
    const currencyMismatch = result.currency && result.currency !== currency;

    return (
      <div className="space-y-4 animate-[floatIn_0.25s_var(--ease-spring)]">
        <div className="flex items-center gap-3">
          {previewUrl && (
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-white/[0.1]" />
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] ai-gradient-text font-semibold">✨ Parsed</span>
            {!result.isLive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-500">
                Simulated
              </span>
            )}
          </div>
        </div>

        {lowConfidence && (
          <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
            Low confidence read — double-check the amount before adding.
          </p>
        )}
        {currencyMismatch && (
          <p className="text-[10px] text-slate-400 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2">
            Receipt shows {result.currency} — will be logged in your app currency ({currency}).
          </p>
        )}

        <div className="rounded-2xl bg-white/[0.03] border border-violet-400/15 p-4 space-y-3">
          <Field label="Merchant" value={result.merchant} />
          <Field label="Amount" value={formatCurrency(result.amount, currency)} />
          {result.taxAmount != null && (
            <Field label="Tax" value={formatCurrency(result.taxAmount, currency)} />
          )}
          <Field
            label="Category"
            value={`${CATEGORY_ICONS[result.category]} ${CATEGORY_LABELS[result.category]}`}
          />
          <Field label="Type" value={result.recurring ? "Recurring" : "One-off"} />
          {result.lineItemsSummary && (
            <p className="text-[10px] text-slate-500 pt-1 border-t border-white/[0.06]">
              {result.lineItemsSummary}
            </p>
          )}
        </div>

        {result.recurring ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 px-1">
              This looks recurring — track it as a subscription instead?
            </p>
            <button
              onClick={() => confirmAdd(true)}
              className="w-full bg-gradient-to-r from-violet-400 to-sky-400 text-obsidian-950 text-sm font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
            >
              Add as Subscription
            </button>
            <button
              onClick={() => confirmAdd(false)}
              className="w-full text-xs text-slate-500 hover:text-slate-300 py-1"
            >
              Log as one-off expense instead
            </button>
          </div>
        ) : (
          <button
            onClick={() => confirmAdd(false)}
            className="w-full bg-gradient-to-r from-violet-400 to-sky-400 text-obsidian-950 text-sm font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            Add Expense
          </button>
        )}
        <button onClick={reset} className="w-full text-xs text-slate-400 hover:text-slate-300">
          Discard
        </button>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="space-y-4 animate-[floatIn_0.2s_ease-out]">
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-white/[0.1]" />
          ) : (
            <SkeletonBlock className="h-14 w-14" />
          )}
          <span className="text-[11px] ai-gradient-text font-semibold animate-pulse">
            ✨ Analyzing receipt…
          </span>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4">
          <SkeletonLines lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          dragOver ? "border-violet-400/60 bg-violet-400/[0.06]" : "border-white/[0.12] bg-white/[0.02]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) runParse({ file });
          }}
        />
        <span className="text-2xl" aria-hidden>
          📸
        </span>
        <span className="text-xs text-slate-300 font-medium">Tap to choose a receipt photo</span>
        <span className="text-[10px] text-slate-400">or drag & drop an image</span>
      </label>

      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <span className="flex-1 h-px bg-white/[0.08]" />
        or paste receipt text
        <span className="flex-1 h-px bg-white/[0.08]" />
      </div>

      <div className="flex gap-2">
        <input
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="e.g. Uber 14.50 transport"
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400/50"
        />
        <button
          disabled={!pastedText.trim()}
          onClick={() => runParse({ text: pastedText })}
          className="px-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-slate-300 disabled:opacity-30"
        >
          Parse
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-medium tracking-tight tabular-nums">{value}</span>
    </div>
  );
}
