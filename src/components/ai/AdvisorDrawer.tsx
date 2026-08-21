import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FinanceState } from "../../types";
import { streamAdvisorReply } from "../../lib/ai/client";
import { uid } from "../../lib/id";
import { ChatBubble, type DisplayMessage } from "./ChatBubble";
import { PromptChips } from "./PromptChips";
import { backdropVariants, panelVariants } from "../../lib/motionPresets";

export function AdvisorDrawer({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || sending) return;

    const userMsg: DisplayMessage = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setInput("");
    setSending(true);

    const result = await streamAdvisorReply(
      history.map((m) => ({ role: m.role, content: m.content })),
      state,
      (textSoFar) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)),
        );
      },
    );

    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, isLive: result.isLive } : m)),
    );
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          variants={backdropVariants(!!reduceMotion)}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full md:max-w-md h-[85vh] md:h-[640px] glass-strong ai-border-glow rounded-t-[32px] md:rounded-[32px] flex flex-col overflow-hidden"
            variants={panelVariants(!!reduceMotion)}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Money Copilot"
          >
        <div className="mesh-glow opacity-50" />

        <div className="relative flex justify-center md:hidden pt-3">
          <div className="h-1 w-10 rounded-full bg-white/[0.15]" />
        </div>

        <div className="relative flex justify-between items-center px-6 pt-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
              <span aria-hidden>✨</span> <span className="ai-gradient-text">Money Copilot</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Your live financial snapshot, on tap</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full glass text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 px-1">Try asking:</p>
              <PromptChips currency={state.currency} onPick={send} />
            </div>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
        </div>

        <div className="relative px-4 py-4 border-t border-white/[0.06] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your money…"
              className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-full px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-sky-400 text-obsidian-950 disabled:opacity-30 active:scale-90 transition-transform duration-150"
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
              aria-label="Send"
            >
              ↑
            </button>
          </form>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
