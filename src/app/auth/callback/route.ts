import { NextResponse } from "next/server";
import { claimEntitlements } from "@/lib/commerce/access";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retorno do magic link. Troca o código pela sessão e, com o e-mail já
 * verificado pelo Supabase, converte as compras da Hotmart em acesso.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/curso";

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/obrigado?erro=${encodeURIComponent(reason)}`, url.origin));

  if (!isSupabaseConfigured) return fail("supabase");
  if (!code) return fail("link");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) return fail("expirado");

  await claimEntitlements(data.user.id);

  return NextResponse.redirect(new URL(next, url.origin));
}
