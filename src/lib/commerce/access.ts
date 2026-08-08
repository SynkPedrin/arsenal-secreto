import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export type AccessState =
  | { kind: "unconfigured" }
  | { kind: "anonymous" }
  /** Logado, mas nenhuma compra aprovada casou com o e-mail verificado. */
  | { kind: "no-purchase"; email: string }
  | { kind: "granted"; email: string; grantedAt: string };

/**
 * Estado de acesso a um produto para a sessão atual.
 *
 * Deliberadamente sem atalho: não existe bypass por env, por header nem por
 * "modo demonstração". Sem Supabase, o resultado é `unconfigured` — que a
 * interface trata como sem acesso, nunca como acesso liberado.
 */
export async function getAccess(productSlug: string): Promise<AccessState> {
  if (!isSupabaseConfigured) return { kind: "unconfigured" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { kind: "anonymous" };

  const { data } = await supabase
    .from("entitlements")
    .select("granted_at")
    .eq("product_slug", productSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return { kind: "no-purchase", email: user.email };
  return { kind: "granted", email: user.email, grantedAt: data.granted_at };
}

/**
 * Converte compras pendentes do e-mail verificado em liberações.
 * Roda sob a sessão do usuário — a função no banco é quem confere se o
 * e-mail está confirmado antes de liberar qualquer coisa.
 */
export async function claimEntitlements(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("claim_entitlements", { p_user_id: userId });

  if (error) {
    console.error("[access] claim_entitlements falhou:", error.message);
    return 0;
  }
  return data ?? 0;
}
