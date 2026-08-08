"use client";

import { useCallback, useRef, useState } from "react";
import {
  readEventStream,
  type AssistantState,
  type ChatMessage,
} from "@/lib/chat/protocol";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AssistantState>("idle");
  const abortRef = useRef<AbortController | null>(null);

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

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      const replyId = crypto.randomUUID();

      // Captura o histórico já com a nova pergunta, sem depender do setState.
      let payload: ChatMessage[] = [];
      setMessages((prev) => {
        payload = [...prev, userMessage];
        return [...payload, { id: replyId, role: "assistant", content: "" }];
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setState("retrieving");

      const appendToReply = (chunk: string) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m)),
        );

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: payload.map(({ role, content: c }) => ({ role, content: c })),
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
            case "delta":
              appendToReply(event.text);
              break;
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
      } catch (error) {
        if (controller.signal.aborted) {
          // Cancelamento do usuário: mantém o que já chegou.
          setMessages((prev) => prev.filter((m) => m.id !== replyId || m.content.length > 0));
          setState("idle");
          return;
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
      } finally {
        abortRef.current = null;
      }
    },
    [busy],
  );

  return { messages, state, busy, send, stop, reset };
}
