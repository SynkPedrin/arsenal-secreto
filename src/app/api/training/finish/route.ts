import { NextResponse } from "next/server";
import { z } from "zod";
import { MODELS } from "@/lib/ai/config";
import { humanizeError } from "@/lib/ai/errors";
import { openai } from "@/lib/ai/openai";
import { DEBRIEF_INSTRUCTION } from "@/lib/ai/persona";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const debriefSchema = z.object({
  result: z.enum(["fechou", "perdeu", "encerrou"]),
  score: z.number().int().min(0).max(10),
  hits: z.array(z.object({ quote: z.string(), why: z.string() })).max(5),
  turning_points: z.array(z.object({ quote: z.string(), effect: z.string() })).max(5),
  missing_play: z.string(),
  next_training: z.string(),
});

const bodySchema = z.object({
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(24_000),
      }),
    )
    .min(1)
    .max(120),
  objective: z.string().max(600).optional(),
});

/** Remove cercas de código que o modelo às vezes insiste em adicionar. */
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Transcrição inválida." }, { status: 400 });
  }

  const { transcript, objective } = parsed.data;

  const conversation = transcript
    .map((m) => `${m.role === "user" ? "CLOSER" : "CLIENTE"}: ${m.content}`)
    .join("\n\n");

  const basePrompt = `${DEBRIEF_INSTRUCTION}${
    objective ? `\n\nObjetivo declarado do closer nesta sessão: ${objective}` : ""
  }\n\n=== TRANSCRIÇÃO DA CALL SIMULADA ===\n\n${conversation}`;

  let lastText = "";

  // Duas tentativas: a segunda mostra ao modelo o próprio erro de formato.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await openai().chat.completions.create({
        model: MODELS.main,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você responde exclusivamente com JSON válido." },
          {
            role: "user",
            content:
              attempt === 0
                ? basePrompt
                : `${basePrompt}\n\nSua resposta anterior não era JSON válido no schema pedido:\n${lastText.slice(0, 800)}\n\nResponda de novo, só o JSON.`,
          },
        ],
      });

      lastText = completion.choices[0]?.message?.content ?? "";
      const debrief = debriefSchema.safeParse(JSON.parse(stripFences(lastText)));

      if (debrief.success) {
        return NextResponse.json({ debrief: debrief.data });
      }
    } catch (error) {
      // Falha de rede/quota não se resolve com retry de formato.
      if (attempt === 1 || !(error instanceof SyntaxError)) {
        if (!(error instanceof SyntaxError)) {
          return NextResponse.json({ error: humanizeError(error) }, { status: 502 });
        }
      }
    }
  }

  // Fallback gracioso: entrega o texto cru para o front renderizar como está.
  return NextResponse.json(
    { debrief: null, raw: lastText || "Não consegui gerar o debriefing." },
    { status: 200 },
  );
}
