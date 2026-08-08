import { NextResponse } from "next/server";
import { z } from "zod";
import { GENERATION, MODELS } from "@/lib/ai/config";
import { openai } from "@/lib/ai/openai";
import { systemPromptWithoutVault } from "@/lib/ai/persona";
import { encodeEvent } from "@/lib/chat/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Traduz as falhas mais comuns da OpenAI em algo acionável. */
function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/no credits remaining|insufficient_quota|exceeded your current quota/i.test(raw)) {
    return "A conta da OpenAI está sem créditos. Adicione saldo em platform.openai.com/settings/organization/billing e tente de novo.";
  }
  if (/invalid[_ ]api[_ ]key|Incorrect API key/i.test(raw)) {
    return "A OPENAI_API_KEY é inválida ou foi revogada. Gere uma nova e atualize o .env.local.";
  }
  if (/rate limit/i.test(raw)) {
    return "Limite de requisições da OpenAI atingido. Aguarde alguns segundos.";
  }
  if (/model .* does not exist|do not have access to/i.test(raw)) {
    return "A chave não tem acesso a este modelo. Ajuste ARSENAL_MODEL em src/lib/ai/config.ts.";
  }
  return raw;
}

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

  const history = parsed.data.messages.slice(-GENERATION.historyWindow);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        // Sem Supabase, o passo de recuperação não roda ainda; o estado é
        // emitido mesmo assim para a esfera já ter o ciclo completo.
        send(encodeEvent({ type: "state", state: "thinking" }));

        const completion = await openai().chat.completions.create({
          model: MODELS.main,
          temperature: GENERATION.temperature,
          max_tokens: GENERATION.maxOutputTokens,
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: "system", content: systemPromptWithoutVault() }, ...history],
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
