"use client";

import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { Orb, StateCaption } from "@/components/sphere/Orb";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { useChat } from "./useChat";

const SUGGESTIONS = [
  "O que você consegue fazer por mim hoje?",
  "Como devo estruturar meu vault do Obsidian?",
  "Me explique busca híbrida com RRF",
] as const;

export function ChatView({ firstName }: { firstName: string }) {
  const { messages, state, busy, send, stop, reset } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = messages.length > 0;

  // Acompanha o streaming sem brigar com o scroll manual do usuário.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20">
        <div className="animate-rise w-full max-w-2xl">
          <h1 className="text-display mb-10 text-center text-4xl md:text-5xl">
            Sua vez, <span className="text-gold">{firstName}</span>!
          </h1>

          <Composer onSend={send} onStop={stop} busy={busy} autoFocus />

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-full border border-hairline px-3.5 py-1.5 text-xs text-muted transition-all duration-200 hover:border-hairline-strong hover:text-gold-soft"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4">
          <Orb state={state} size={260} />
          <StateCaption state={state} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-hairline px-6 py-3 md:px-10">
        <Orb state={state} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-display text-sm text-ink">Arsenal</p>
          <StateCaption state={state} />
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted transition-all duration-200 hover:border-hairline-strong hover:text-gold-soft"
        >
          <RotateCcw size={13} strokeWidth={1.8} aria-hidden />
          Nova conversa
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-7 px-6 py-8 md:px-10">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              streaming={busy && message.id === messages.at(-1)?.id && message.role === "assistant"}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-hairline bg-void/80 px-6 py-4 backdrop-blur-md md:px-10">
        <div className="mx-auto w-full max-w-3xl">
          <Composer onSend={send} onStop={stop} busy={busy} placeholder="Continue…" />
        </div>
      </div>
    </div>
  );
}
