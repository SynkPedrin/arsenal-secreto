import { describe, expect, it } from "vitest";
import { encodeEvent, readEventStream, type ChatEvent } from "./protocol";

function streamOf(text: string, chunkSize = text.length): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;

  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of readEventStream(stream)) events.push(event);
  return events;
}

describe("protocolo SSE do chat", () => {
  it("faz ida e volta de um evento", async () => {
    const payload = encodeEvent({ type: "delta", text: "olá" });
    expect(await collect(streamOf(payload))).toEqual([{ type: "delta", text: "olá" }]);
  });

  it("remonta eventos partidos no meio pelo chunking da rede", async () => {
    const wire =
      encodeEvent({ type: "state", state: "thinking" }) +
      encodeEvent({ type: "delta", text: "resposta longa" }) +
      encodeEvent({ type: "done", model: "m", promptTokens: 1, completionTokens: 2 });

    // 7 bytes por chunk corta no meio de quase todo frame.
    const events = await collect(streamOf(wire, 7));

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: "state", state: "thinking" });
    expect(events[1]).toEqual({ type: "delta", text: "resposta longa" });
  });

  it("ignora frame corrompido sem derrubar o resto do stream", async () => {
    const wire = "data: {isso não é json}\n\n" + encodeEvent({ type: "delta", text: "sobrevivi" });
    expect(await collect(streamOf(wire))).toEqual([{ type: "delta", text: "sobrevivi" }]);
  });

  it("preserva acento e emoji ao atravessar a fronteira de chunk", async () => {
    const text = "ação · fechamento 🥊";
    const events = await collect(streamOf(encodeEvent({ type: "delta", text }), 3));
    expect(events).toEqual([{ type: "delta", text }]);
  });
});
