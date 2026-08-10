import { NextResponse } from "next/server";
import { z } from "zod";
import { MODELS, REASONING } from "@/lib/ai/config";
import { humanizeError } from "@/lib/ai/errors";
import { llm } from "@/lib/ai/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const insightSchema = z.object({
  headline: z.string(),
  strengths: z.array(z.string()).max(4),
  patterns: z
    .array(z.object({ theme: z.string(), evidence: z.string(), fix: z.string() }))
    .max(4),
  next_steps: z.array(z.string()).max(4),
  focus: z.string(),
});

const bodySchema = z.object({
  sessions: z
    .array(
      z.object({
        date: z.string().max(40),
        profile: z.string().max(60),
        difficulty: z.string().max(20),
        objective: z.string().max(400),
        result: z.string().max(20),
        score: z.number(),
        missing_play: z.string().max(600),
        next_training: z.string().max(300),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM = `Você é a IA Arsenal, mentora de closers high ticket do método de
David William. Direta, sem maquiagem, campo acima de teoria. Você está lendo o
histórico consolidado de treinos de um closer para dar o diagnóstico do período —
não de uma call isolada, mas do padrão que atravessa todas elas.

Regras:
· Aponte o padrão, não o evento. "Cedeu preço" só vale se aparece em mais de uma sessão.
· Nada de elogio fácil. Se não houve avanço real, diga.
· Cada "fix" precisa ser executável na próxima call, não um conselho de palestra.
· Nunca invente calls, números ou frases do David que não estejam nos dados.
· Português do Brasil, frases curtas.

Responda exclusivamente com JSON válido neste schema:
{
  "headline": "<leitura do período em 1-2 frases secas>",
  "strengths": ["<o que já está consolidado>"],
  "patterns": [{ "theme": "<o erro recorrente>", "evidence": "<em que sessões aparece>", "fix": "<o que fazer na próxima call>" }],
  "next_steps": ["<ação concreta>"],
  "focus": "<o perfil ou objeção que ele precisa treinar agora>"
}`;

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Histórico insuficiente." }, { status: 400 });
  }

  const { sessions } = parsed.data;
  const digest = sessions
    .map(
      (s, i) =>
        `#${i + 1} · ${s.date} · ${s.profile} (${s.difficulty}) · resultado: ${s.result} · nota ${s.score}\n` +
        `  objetivo: ${s.objective}\n` +
        `  jogada que faltou: ${s.missing_play}\n` +
        `  próximo treino sugerido: ${s.next_training}`,
    )
    .join("\n\n");

  try {
    const completion = await llm().chat.completions.create({
      model: MODELS.main,
      temperature: 0.3,
      // Encontrar padrão entre sessões exige comparar; vale o raciocínio.
      reasoning_effort: REASONING.judgment,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `=== HISTÓRICO DE TREINOS ===\n\n${digest}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const insight = insightSchema.safeParse(JSON.parse(raw));

    if (!insight.success) {
      return NextResponse.json({ error: "A IA respondeu fora do formato." }, { status: 502 });
    }

    return NextResponse.json({ insight: insight.data });
  } catch (error) {
    const message = error instanceof SyntaxError ? "A IA respondeu fora do formato." : humanizeError(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
