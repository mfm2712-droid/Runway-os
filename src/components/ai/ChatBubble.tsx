import { SkeletonLines } from "./Skeleton";
import { stripMarkdownEmphasis } from "../../lib/textFormat";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  isLive?: boolean;
}

export function ChatBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-sky-500 text-obsidian-950 text-sm font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  const isEmpty = message.streaming && message.content.length === 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[11px] ai-gradient-text font-semibold">✨ Money Copilot</span>
          {message.isLive === false && !message.streaming && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-500">
              Simulated
            </span>
          )}
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-bl-md glass border border-violet-400/15 text-sm text-slate-200 leading-relaxed">
          {isEmpty ? (
            <SkeletonLines lines={2} />
          ) : (
            <>
              {stripMarkdownEmphasis(message.content)}
              {message.streaming && <span className="typewriter-caret h-4 align-middle" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
