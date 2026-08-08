import type { RagSource } from "@/lib/supabase/database.types";

/** Estados que dirigem a esfera de partículas (F4). */
export type AssistantState =
  | "idle"
  | "listening"
  | "retrieving"
  | "thinking"
  | "answering"
  | "error";

export type ChatEvent =
  | { type: "state"; state: AssistantState }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: RagSource[] }
  | { type: "done"; model: string; promptTokens: number; completionTokens: number }
  | { type: "error"; message: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  error?: boolean;
  /** Vai no histórico enviado ao modelo, mas não é renderizada. */
  hidden?: boolean;
};

/** Serializa um evento no formato SSE (`data: {...}\n\n`). */
export function encodeEvent(event: ChatEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Lê um corpo SSE e entrega eventos já parseados.
 * Acumula em buffer porque um chunk da rede pode cortar um evento ao meio.
 */
export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data:")) continue;

        try {
          yield JSON.parse(line.slice(5).trim()) as ChatEvent;
        } catch {
          // Frame corrompido: ignora e segue o stream.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
