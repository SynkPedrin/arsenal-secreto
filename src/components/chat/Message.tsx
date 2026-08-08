"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, FileText } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/protocol";

/** Cursor de digitação enquanto o token seguinte não chegou. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-gold"
    />
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-hairline bg-elevated px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  streaming,
  label,
  tone,
}: {
  message: ChatMessage;
  streaming: boolean;
  label?: string;
  tone: "gold" | "burn";
}) {
  if (message.error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-burnt/40 bg-amber-burnt/[0.07] px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-burnt" aria-hidden />
        <p className="text-sm text-ink/90">{message.content}</p>
      </div>
    );
  }

  return (
    <div>
      {/* No sparring, quem fala é o cliente — deixar isso explícito evita
          que o closer trate a IA como mentora no meio do treino. */}
      {label ? (
        <p
          className={`text-meta mb-2 ${tone === "burn" ? "text-amber-burnt" : "text-gold-soft"}`}
        >
          {label}
        </p>
      ) : null}

      <div
        className="prose-arsenal text-[15px] leading-relaxed text-ink"
        aria-live={streaming ? "polite" : undefined}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        {streaming ? <Caret /> : null}
      </div>

      {message.sources?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.sources.map((source) => (
            <span
              key={source.chunk_id}
              title={source.excerpt}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel px-2.5 py-1 font-mono text-[11px] text-gold-soft transition-colors duration-200 hover:border-hairline-strong"
            >
              <FileText size={11} strokeWidth={1.8} aria-hidden />
              {source.note_title}
              {source.heading_path ? (
                <span className="text-muted">› {source.heading_path}</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Message({
  message,
  streaming,
  assistantLabel,
  assistantTone = "gold",
}: {
  message: ChatMessage;
  streaming: boolean;
  assistantLabel?: string;
  assistantTone?: "gold" | "burn";
}) {
  return (
    <div className="animate-rise">
      {message.role === "user" ? (
        <UserMessage content={message.content} />
      ) : (
        <AssistantMessage
          message={message}
          streaming={streaming}
          label={assistantLabel}
          tone={assistantTone}
        />
      )}
    </div>
  );
}
