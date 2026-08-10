import { NextResponse } from "next/server";
import { MODELS } from "@/lib/ai/config";
import { humanizeError } from "@/lib/ai/errors";
import { llm } from "@/lib/ai/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];

export async function POST(request: Request) {
  let file: File | null = null;

  try {
    const form = await request.formData();
    const entry = form.get("audio");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Nenhum áudio recebido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Áudio acima de 25MB." }, { status: 413 });
  }
  // Nada abaixo disso é fala — evita queimar chamada à API com ruído de clique.
  if (file.size < 2_000) {
    return NextResponse.json({ error: "Áudio curto demais." }, { status: 400 });
  }

  const mime = file.type.split(";")[0];
  if (mime && !ALLOWED_PREFIXES.includes(mime)) {
    return NextResponse.json({ error: `Formato não suportado: ${mime}.` }, { status: 415 });
  }

  const startedAt = Date.now();

  try {
    const transcription = await llm().audio.transcriptions.create({
      file,
      model: MODELS.transcription,
      language: "pt",
    });

    return NextResponse.json({
      text: transcription.text,
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    // O turbo é mais rápido; o large completo é mais tolerante a áudio ruim.
    try {
      const fallback = await llm().audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        language: "pt",
      });

      return NextResponse.json({
        text: fallback.text,
        duration_ms: Date.now() - startedAt,
      });
    } catch {
      return NextResponse.json({ error: humanizeError(error) }, { status: 502 });
    }
  }
}
