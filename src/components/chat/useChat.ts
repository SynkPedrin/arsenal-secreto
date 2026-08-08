"use client";

import { useCallback, useRef, useState } from "react";
import type { TrainingBlock, UserProfile } from "@/lib/ai/persona";
import { readEventStream, type AssistantState, type ChatMessage } from "@/lib/chat/protocol";

/** Intervalo mínimo entre pulsos da esfera durante o streaming. */
const PULSE_THROTTLE_MS = 220;

export type ChatOptions = {
  profile?: UserProfile;
  training?: TrainingBlock;
  /** Chamado com a resposta completa — usado pelo TTS. */
  onReply?: (text: string) => void;
};

export function useChat({ profile, training, onReply }: ChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AssistantState>("idle");
  const [pulse, setPulse] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const lastPulseRef = useRef(0);
  const optionsRef = useRef({ profile, training, onReply });
  optionsRef.current = { profile, training, onReply };

  const busy = state === "retrieving" || state === "thinking" || state === "answering";

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setState("idle");
  }, []);

  /**
   * Envia uma mensagem. `hidden` mantém o texto fora da tela mas dentro do
   * histórico — é como o comando de abertura do sparring entra sem poluir o chat.
   */
  const send = useCallback(
    async (text: string, options: { hidden?: boolean } = {}) => {
      const content = text.trim();
      if (!content) return;

      abortRef.current?.abort();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        hidden: options.hidden,
      };
      const replyId = crypto.randomUUID();

      let payload: ChatMessage[] = [];
      setMessages((prev) => {
        payload = [...prev, userMessage];
        return [...payload, { id: replyId, role: "assistant", content: "" }];
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setState("retrieving");

      let full = "";

      try {
        const { profile: p, training: t, onReply: reply } = optionsRef.current;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: payload.map(({ role, content: c }) => ({ role, content: c })),
            ...(p && Object.keys(p).length > 0 ? { profile: p } : {}),
            ...(t ? { training: t } : {}),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 400
              ? "Mensagem rejeitada pelo servidor."
              : `Servidor respondeu ${response.status}.`,
          );
        }

        for await (const event of readEventStream(response.body)) {
          switch (event.type) {
            case "state":
              setState(event.state);
              break;

            case "delta": {
              full += event.text;
              const snapshot = full;
              setMessages((prev) =>
                prev.map((m) => (m.id === replyId ? { ...m, content: snapshot } : m)),
              );

              const now = performance.now();
              if (now - lastPulseRef.current > PULSE_THROTTLE_MS) {
                lastPulseRef.current = now;
                setPulse((n) => n + 1);
              }
              break;
            }

            case "sources":
              setMessages((prev) =>
                prev.map((m) => (m.id === replyId ? { ...m, sources: event.sources } : m)),
              );
              break;

            case "error":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === replyId ? { ...m, content: event.message, error: true } : m,
                ),
              );
              break;

            case "done":
              break;
          }
        }

        setState("idle");
        if (full) reply?.(full);
        return full;
      } catch (error) {
        if (controller.signal.aborted) {
          setMessages((prev) => prev.filter((m) => m.id !== replyId || m.content.length > 0));
          setState("idle");
          return full;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  content:
                    error instanceof Error ? error.message : "Não consegui completar a resposta.",
                  error: true,
                }
              : m,
          ),
        );
        setState("error");
        setTimeout(() => setState("idle"), 2400);
        return full;
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  return { messages, state, busy, pulse, send, stop, reset };
}
