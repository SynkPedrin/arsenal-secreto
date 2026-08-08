/**
 * Ambiente público — o que pode chegar ao browser.
 * As referências a process.env.NEXT_PUBLIC_* precisam ser literais
 * para o Next inlinar os valores no bundle.
 *
 * Nada aqui lança no import: o app precisa continuar buildando e rodando
 * antes das chaves existirem. Quem realmente depende do Supabase chama
 * `requireSupabaseConfig()` e recebe um erro claro no ponto de uso.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const publicEnv = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  arsenalSecretoUrl:
    process.env.NEXT_PUBLIC_ARSENAL_SECRETO_URL ?? "https://arsenalsecreto.lovable.app/",
} as const;

/** true quando dá para falar com o Supabase. Telas usam isto para degradar. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export function requireSupabaseConfig(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado: preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local.",
    );
  }
  return { url, anonKey };
}
