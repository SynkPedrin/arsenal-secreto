import { z } from "zod";

/**
 * Ambiente público — o que pode chegar ao browser.
 * As referências a process.env.NEXT_PUBLIC_* precisam ser literais
 * para o Next inlinar os valores no bundle.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY vazia"),
  NEXT_PUBLIC_ARSENAL_SECRETO_URL: z.string().url().default("https://arsenalsecreto.lovable.app/"),
});

const parsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ARSENAL_SECRETO_URL: process.env.NEXT_PUBLIC_ARSENAL_SECRETO_URL,
});

if (!parsed.success) {
  throw new Error(
    `Variáveis de ambiente públicas inválidas:\n${parsed.error.issues
      .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
      .join("\n")}\n\nPreencha .env.local a partir de .env.example.`,
  );
}

export const publicEnv = parsed.data;
