import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { MASTER_COOKIE } from "@/lib/commerce/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Destrava a área do curso sem compra, para demonstração e gravação.
 *
 * É a ÚNICA porta de acesso que não passa por compra verificada, e existe
 * porque foi pedida explicitamente. Por isso:
 *   · desligada por padrão — sem ARSENAL_MASTER_KEY no ambiente, responde 404;
 *   · a chave é comparada em tempo constante;
 *   · o cookie é httpOnly e dura 12h, não "para sempre";
 *   · a interface mostra selo "acesso master", para ninguém confundir isso
 *     com uma liberação real da Hotmart.
 *
 * NUNCA definir ARSENAL_MASTER_KEY no ambiente de produção.
 */
const TWELVE_HOURS = 60 * 60 * 12;

function keyMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const expected = process.env.ARSENAL_MASTER_KEY;
  const url = new URL(request.url);

  // Sem chave configurada, a rota não existe.
  if (!expected) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  if (!keyMatches(url.searchParams.get("key"), expected)) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/curso", url.origin));
  response.cookies.set(MASTER_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TWELVE_HOURS,
  });
  return response;
}

/** Sair do modo master. */
export async function DELETE(request: Request) {
  const response = NextResponse.redirect(new URL("/curso", new URL(request.url).origin));
  response.cookies.delete(MASTER_COOKIE);
  return response;
}
