import { NextResponse } from "next/server";
import { z } from "zod";
import { GENERATION, MODELS, REASONING } from "@/lib/ai/config";
import { humanizeError } from "@/lib/ai/errors";
import { llm } from "@/lib/ai/llm";
import { buildSystemPrompt } from "@/lib/ai/persona";
import { encodeEvent } from "@/lib/chat/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trainingSchema = z.object({
  objective: z.string().min(1).max(600),
  product: z.string().max(200).optional(),
  ticket: z.number().nonnegative().optional(),
  clientProfile: z.string().min(1).max(80),
  difficulty: z.enum(["campo", "inferno"]),
  recentDebriefs: z
    .array(
      z.object({
        date: z.string().max(40),
        score: z.number().int().min(0).max(10),
        missingPlay: z.string().max(400),
      }),
    )
    .max(3)
    .optional(),
});

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(24_000),
      }),
    )
    .min(1)
    .max(80),
  profile: z
    .object({
      name: z.string().max(80).optional(),
      product: z.string().max(200).optional(),
      ticket: z.number().nonnegative().optional(),
      niche: z.string().max(80).optional(),
    })
    .optional(),
  training: trainingSchema.optional(),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagens inválidas." }, { status: 400 });
  }

  const { messages, profile, training } = parsed.data;
  const history = messages.slice(-GENERATION.historyWindow);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        // O RAG entra aqui na F2. Até lá o cérebro chega vazio e o system
        // prompt assume o modo "sem acervo", que proíbe citar calls.
        send(encodeEvent({ type: "state", state: "thinking" }));

        const system = buildSystemPrompt({ sources: [], profile, training });

        const completion = await llm().chat.completions.create({
          model: MODELS.main,
          // Sparring precisa de mais improviso que consultoria.
          temperature: training ? 0.75 : GENERATION.temperature,
          max_tokens: GENERATION.maxOutputTokens,
          // O modelo raciocina antes de responder; no chat isso é latência
          // pura, então fica no mínimo. Ver REASONING em ai/config.
          reasoning_effort: REASONING.chat,
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: "system", content: system }, ...history],
        });

        let answering = false;
        let promptTokens = 0;
        let completionTokens = 0;

        for await (const chunk of completion) {
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }

          const text = chunk.choices[0]?.delta?.content;
          if (!text) continue;

          if (!answering) {
            answering = true;
            send(encodeEvent({ type: "state", state: "answering" }));
          }
          send(encodeEvent({ type: "delta", text }));
        }

        send(
          encodeEvent({
            type: "done",
            model: MODELS.main,
            promptTokens,
            completionTokens,
          }),
        );
      } catch (error) {
        send(encodeEvent({ type: "state", state: "error" }));
        send(encodeEvent({ type: "error", message: humanizeError(error) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
