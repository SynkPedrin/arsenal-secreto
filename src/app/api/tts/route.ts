import { NextResponse } from "next/server";
import { z } from "zod";
import { MODELS, TTS_VOICE } from "@/lib/ai/config";
import { humanizeError } from "@/lib/ai/errors";
import { openai } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(4000),
  speed: z.number().min(0.5).max(2).default(1.05),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Texto inválido." }, { status: 400 });
  }

  try {
    const speech = await openai().audio.speech.create({
      model: MODELS.tts,
      voice: TTS_VOICE,
      input: parsed.data.text,
      speed: parsed.data.speed,
      response_format: "mp3",
    });

    return new Response(speech.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: humanizeError(error) }, { status: 502 });
  }
}
