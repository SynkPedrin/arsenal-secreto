import "server-only";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

/** Cookie do acesso de demonstração — ver src/app/acesso-master/route.ts. */
export const MASTER_COOKIE = "arsenal_master";

export type AccessState =
  | { kind: "unconfigured" }
  | { kind: "anonymous" }
  /** Logado, mas nenhuma compra aprovada casou com o e-mail verificado. */
  | { kind: "no-purchase"; email: string }
  | { kind: "granted"; email: string; grantedAt: string; source: "compra" | "master" };

/**
 * Estado de acesso a um produto para a sessão atual.
 *
 * O único atalho é o cookie master, que só existe quando ARSENAL_MASTER_KEY
 * está definida no ambiente e a chave foi apresentada. Ele é sinalizado como
 * `source: "master"` até a interface, para nunca passar por compra real.
 */
export async function getAccess(productSlug: string): Promise<AccessState> {
  if (process.env.ARSENAL_MASTER_KEY) {
    const jar = await cookies();
    if (jar.get(MASTER_COOKIE)?.value === "1") {
      return {
        kind: "granted",
        email: "acesso master",
        grantedAt: new Date().toISOString(),
        source: "master",
      };
    }
  }

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
  return { kind: "granted", email: user.email, grantedAt: data.granted_at, source: "compra" };
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
