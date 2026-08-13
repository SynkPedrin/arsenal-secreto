import { NextResponse } from "next/server";
import { invalidateVault } from "@/lib/rag/vault";
import { retrieve, vaultStatus } from "@/lib/rag/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Números do cérebro: o que a IA realmente enxerga neste momento. */
export async function GET() {
  return NextResponse.json(await vaultStatus());
}

/** Reindexa e, se vier `q`, devolve o que a busca encontraria — depuração do RAG. */
export async function POST(request: Request) {
  invalidateVault();

  let query = "";
  try {
    const body = (await request.json()) as { q?: unknown };
    if (typeof body.q === "string") query = body.q;
  } catch {
    // Sem corpo: só reindexa.
  }

  const status = await vaultStatus();
  const results = query ? await retrieve(query) : [];
  return NextResponse.json({ ...status, query, results });
}
