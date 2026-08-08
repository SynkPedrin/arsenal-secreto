import "server-only";
import { z } from "zod";

/**
 * Segredos. O import de "server-only" faz o build quebrar se algum
 * componente de cliente puxar este módulo, direta ou indiretamente.
 */
const serverSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY ausente"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY ausente"),
  ARSENAL_SECRETO_URL: z.string().url().default("https://arsenalsecreto.lovable.app/"),
});

let cached: z.infer<typeof serverSchema> | null = null;

/**
 * Lazy: a validação só roda quando um segredo é realmente usado.
 * Assim `next build` não exige as chaves para renderizar telas estáticas.
 */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (cached) return cached;

  const parsed = serverSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ARSENAL_SECRETO_URL: process.env.ARSENAL_SECRETO_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente de servidor inválidas:\n${parsed.error.issues
        .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }

  cached = parsed.data;
  return cached;
}
